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
import { SEED_DATABASE } from './seed';

const BLOB_PATHNAME = 'greenhouse-finance-pro/database.json';
const ENVELOPE_VERSION = 1;

export type PersistenceMode = 'blob' | 'local-file' | 'unconfigured';

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
    const result = await get(BLOB_PATHNAME, { access: 'public', useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;

    const text = await new Response(result.stream as ReadableStream).text();
    const parsed = JSON.parse(text);
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
  } catch {
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

  await put(BLOB_PATHNAME, JSON.stringify(envelope), {
    access: 'public',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });

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
