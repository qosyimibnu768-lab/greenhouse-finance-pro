/**
 * Vercel Serverless Function: /api/sync/version
 * GET → nomor versi data terbaru (dipakai polling sinkronisasi klien).
 */
import { persistenceMode, readEnvelope, storageMessage } from '../../server-lib/blobStore';
import { jsonResponse } from '../../server-lib/http';

export async function GET(): Promise<Response> {
  if (persistenceMode() === 'unconfigured') {
    return jsonResponse({ error: storageMessage(), storage: 'unconfigured' }, 503);
  }

  const envelope = await readEnvelope();
  return jsonResponse({ version: envelope?.version ?? 0, timestamp: new Date().toISOString() });
}
