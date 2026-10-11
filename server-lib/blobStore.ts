/**
 * Penyimpanan database untuk Vercel Serverless Functions.
 *
 * Mode:
 *  - "upstash"       : Upstash Redis (REST) — alternatif gratis (256 MB, 500 rb perintah/bulan).
 *                      Aktif otomatis bila env UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN diisi.
 *  - "blob"          : Vercel Blob (produksi di Vercel yang sudah dihubungkan ke Blob store)
 *  - "local-file"    : file data/greenhouse_db.json (untuk pengujian lokal tanpa env Vercel)
 *  - "unconfigured"  : berjalan di Vercel TANPA penyimpanan — endpoint mengembalikan 503
 *
 * Bentuk data di penyimpanan: envelope { envelopeVersion, version, updatedAt, data }.
 * `version` dipakai endpoint /api/sync/version untuk sinkronisasi multi-perangkat.
 */
import { get, put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { SEED_DATABASE } from './seed.js';

const BLOB_PATHNAME = process.env.GFP_BLOB_PATH || 'greenhouse-finance-pro/database-v2.json';
const ENVELOPE_VERSION = 1;

export type PersistenceMode = 'upstash' | 'blob' | 'local-file' | 'unconfigured';

/** Error khusus: Blob store milik akun Vercel sedang di-suspend (mis. masalah billing/kuota). */
export class BlobStoreSuspendedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlobStoreSuspendedError';
  }
}

export function isStoreSuspendedError(error: any): boolean {
  if (error instanceof BlobStoreSuspendedError) return true;
  const msg = String(error?.message || error || '');
  return /suspend/i.test(msg);
}

export interface DbEnvelope {
  envelopeVersion: number;
  version: number;
  updatedAt: string;
  data: any;
}

export function persistenceMode(): PersistenceMode {
  const forced = (process.env.GFP_STORAGE || '').toLowerCase();

  if (forced === 'local' || forced === 'local-file') return 'local-file';
  if (forced === 'blob') return hasVercelBlobEnv() ? 'blob' : process.env.VERCEL ? 'unconfigured' : 'local-file';
  if (forced === 'upstash') return hasUpstashEnv() ? 'upstash' : process.env.VERCEL ? 'unconfigured' : 'local-file';

  // Otomatis: Upstash diprioritaskan bila env-nya ada (bisa dipakai di Vercel maupun lokal).
  if (hasUpstashEnv()) return 'upstash';
  if (hasVercelBlobEnv()) return 'blob';
  if (process.env.VERCEL) return 'unconfigured';
  return 'local-file';
}

export function storageMessage(): string {
  return 'Penyimpanan cloud belum dikonfigurasi. Opsi gratis: (1) Upstash Redis — isi env UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN lalu Redeploy; (2) Vercel Blob — hubungkan Blob store di Vercel Dashboard → Storage.';
}

// ===== Upstash Redis (REST) — penyimpanan alternatif gratis =====
function upstashConfig(): { url: string; token: string; key: string } {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
    key: process.env.GFP_REDIS_KEY || 'greenhouse-finance-pro:database-v2',
  };
}

function hasUpstashEnv(): boolean {
  const cfg = upstashConfig();
  return Boolean(cfg.url && cfg.token);
}

export function hasVercelBlobEnv(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  );
}

/**
 * Kirim satu perintah Redis via REST Upstash.
 * Dokumentasi: POST {URL} dengan body JSON array, mis. ["SET","key","value"] / ["GET","key"].
 */
async function upstashCommand(command: Array<string | number>): Promise<any> {
  const cfg = upstashConfig();
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`Upstash Redis: HTTP ${res.status}${text ? ` - ${text.slice(0, 200)}` : ''}`);
  }

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (data && typeof data === 'object' && data.error) {
    throw new Error(`Upstash Redis: ${String(data.error).slice(0, 200)}`);
  }
  return data?.result ?? null;
}

function localFilePath(): string {
  return process.env.GFP_LOCAL_DB || path.join(process.cwd(), 'data', 'greenhouse_db.json');
}

/**
 * Access memori (per instance function) untuk menghindari percobaan berulang.
 * Blob store bisa dibuat sebagai Public atau Private — kode mendeteksi otomatis.
 *
 * PENTING: cache baca dan tulis dipisah. Pada store Private, operasi baca
 * masih bisa berhasil dengan flag 'public', tetapi operasi tulis DITOLAK.
 * Karena itu cache tulis tidak boleh "teracuni" oleh keberhasilan baca, dan
 * fallback ke mode akses lain harus SELALU dicoba (bukan hanya saat cache kosong).
 */
let cachedReadAccess: 'public' | 'private' | null = null;
let cachedWriteAccess: 'public' | 'private' | null = null;

function accessOrder(cached: 'public' | 'private' | null): Array<'public' | 'private'> {
  // Default: coba 'private' lebih dulu — store private membalas lewat jalur
  // konsisten (tanpa cache CDN), sehingga data selalu terbaru.
  return cached === 'public' ? ['public', 'private'] : ['private', 'public'];
}

async function blobGetPayload(): Promise<any | null> {
  for (const access of accessOrder(cachedReadAccess)) {
    try {
      const result = await get(BLOB_PATHNAME, { access, useCache: false });
      if (result && result.statusCode === 200 && result.stream) {
        cachedReadAccess = access;
        const text = await new Response(result.stream as ReadableStream).text();
        return JSON.parse(text);
      }
    } catch (error) {
      // Store di-suspend Vercel → jangan diperlakukan sebagai "data kosong".
      if (isStoreSuspendedError(error)) {
        throw new BlobStoreSuspendedError(String((error as any)?.message || 'Vercel Blob store suspended'));
      }
      // Mode akses ini tidak berhasil — coba mode berikutnya
      if (cachedReadAccess === access) cachedReadAccess = null;
    }
  }
  return null;
}

async function blobPutPayload(text: string): Promise<void> {
  let lastError: any = null;
  for (const access of accessOrder(cachedWriteAccess)) {
    try {
      await put(BLOB_PATHNAME, text, {
        access,
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: 'application/json',
        cacheControlMaxAge: 60,
      });
      cachedWriteAccess = access;
      return;
    } catch (error) {
      lastError = error;
      // Mode akses ini tidak cocok dengan store — jangan dipakai lagi sebagai preferensi
      if (cachedWriteAccess === access) cachedWriteAccess = null;
    }
  }
  throw lastError || new Error('Gagal menyimpan ke Vercel Blob');
}

export async function readEnvelope(): Promise<DbEnvelope | null> {
  const mode = persistenceMode();

  if (mode === 'local-file') {
    try {
      const filePath = localFilePath();
      const raw = fs.readFileSync(filePath, 'utf-8');
      const stats = fs.statSync(filePath);
      return {
        envelopeVersion: ENVELOPE_VERSION,
        version: stats.mtimeMs,
        updatedAt: stats.mtime.toISOString(),
        data: JSON.parse(raw),
      };
    } catch {
      return null;
    }
  }

  if (mode === 'upstash') {
    const cfg = upstashConfig();
    const raw = await upstashCommand(['GET', cfg.key]);
    if (!raw || typeof raw !== 'string') return null;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (parsed && typeof parsed === 'object' && parsed.envelopeVersion && parsed.data) {
      return parsed as DbEnvelope;
    }
    // Kompatibilitas: data lama tersimpan sebagai database mentah
    return {
      envelopeVersion: ENVELOPE_VERSION,
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      data: parsed,
    };
  }

  if (mode !== 'blob') return null;

  try {
    const parsed = await blobGetPayload();
    if (!parsed || typeof parsed !== 'object') return null;

    if (parsed.envelopeVersion && parsed.data) {
      return parsed as DbEnvelope;
    }
    // Kompatibilitas: data lama tersimpan sebagai database mentah
    return {
      envelopeVersion: ENVELOPE_VERSION,
      version: Date.now(),
      updatedAt: new Date().toISOString(),
      data: parsed,
    };
  } catch (error) {
    if (isStoreSuspendedError(error)) throw error;
    return null;
  }
}

/**
 * Menyimpan database. `version` menggunakan stempel waktu (selalu berubah setiap tulisan),
 * sehingga klien bisa mendeteksi perubahan tanpa perlu membaca dulu.
 */
export async function writeEnvelope(data: any): Promise<number> {
  const mode = persistenceMode();
  const version = Date.now();

  if (mode === 'local-file') {
    const filePath = localFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return version;
  }

  if (mode === 'upstash') {
    const cfg = upstashConfig();
    const envelope: DbEnvelope = {
      envelopeVersion: ENVELOPE_VERSION,
      version,
      updatedAt: new Date().toISOString(),
      data,
    };
    await upstashCommand(['SET', cfg.key, JSON.stringify(envelope)]);
    return version;
  }

  if (mode !== 'blob') {
    throw new Error(storageMessage());
  }

  const envelope: DbEnvelope = {
    envelopeVersion: ENVELOPE_VERSION,
    version,
    updatedAt: new Date().toISOString(),
    data,
  };

  await blobPutPayload(JSON.stringify(envelope));

  return version;
}

/** Pastikan database tersedia; jika belum ada, inisialisasi dengan data demo (seed). */
export async function ensureEnvelope(): Promise<DbEnvelope | null> {
  const existing = await readEnvelope();
  if (existing) return existing;
  if (persistenceMode() === 'unconfigured') return null;

  const version = await writeEnvelope(SEED_DATABASE);
  return {
    envelopeVersion: ENVELOPE_VERSION,
    version,
    updatedAt: new Date().toISOString(),
    data: SEED_DATABASE,
  };
}

/** Struktur database kosong (untuk fitur "Hapus semua data"). */
export function buildEmptyDatabase(): any {
  return {
    tunnels: [],
    transactions: [],
    cycles: [],
    harvests: [],
    investments: [],
    assets: [],
    inventory: [],
    stockMutations: [],
    debts: [],
    employees: [],
    workShifts: [],
    attendances: [],
    leaveRequests: [],
    overtimeRequests: [],
    payrolls: [],
    employeeAuditLogs: [],
    payrollSettings: SEED_DATABASE?.payrollSettings,
    lastSynced: new Date().toISOString(),
  };
}
