/**
 * Vercel Serverless Function: /api/sync/version
 * GET → nomor versi data terbaru (dipakai polling sinkronisasi klien).
 */
import { isStoreSuspendedError, persistenceMode, readEnvelope, storageMessage } from '../../server-lib/blobStore.js';
import { jsonResponse } from '../../server-lib/http.js';

export async function GET(): Promise<Response> {
  if (persistenceMode() === 'unconfigured') {
    return jsonResponse({ error: storageMessage(), storage: 'unconfigured' }, 503);
  }

  try {
    const envelope = await readEnvelope();
    return jsonResponse({ version: envelope?.version ?? 0, timestamp: new Date().toISOString() });
  } catch (error: any) {
    if (isStoreSuspendedError(error)) {
      return jsonResponse(
        { version: 0, suspended: true, error: 'Penyimpanan cloud Vercel sedang di-suspend oleh Vercel' },
        503
      );
    }
    return jsonResponse({ version: 0, error: 'Gagal membaca versi data', details: error?.message }, 500);
  }
}
