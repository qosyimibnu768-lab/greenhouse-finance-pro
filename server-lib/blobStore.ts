/**
 * Penyimpanan database untuk Vercel Serverless Functions.
 *
 * Mode:
 *  - "blob"          : Vercel Blob (produksi di Vercel yang sudah dihubungkan ke Blob store)
 *  - "local-file"    : file data/greenhouse_db.json (untuk pengujian lokal tanpa env Vercel)
 *  - "unconfigured"  : berjalan di Vercel TANPA Blob store — endpoint mengembalikan 503
 *
 * Bentuk data di Blob: envelope { envelopeVersion, version, updatedAt, data }.
 * `version` dipakai endpoint /api/sync/version untuk sinkronisasi multi-perangkat.
 */
import { get, put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { SEED_DATABASE } from './seed.js';

const BLOB_PATHNAME = process.env.GFP_BLOB_PATH || 'greenhouse-finance-pro/database-v2.json';
const ENVELOPE_VERSION = 1;

export type PersistenceMode = 'blob' | 'local-file' | 'unconfigured';

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
  if (process.env.BLOB_READ_WRITE_TOKEN) return 'blob';
  if (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN) return 'blob';
  if (process.env.VERCEL) return 'unconfigured';
  return 'local-file';
}

export function storageMessage(): string {
  return 'Penyimpanan Vercel Blob belum dihubungkan ke project ini. Buka Vercel Dashboard → tab Storage → Create/Connect Blob store ke project, lalu lakukan Redeploy.';
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
