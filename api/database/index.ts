/**
 * Vercel Serverless Function: /api/database
 * GET  → baca database
 * POST → simpan seluruh database (dipakai aplikasi setiap ada perubahan)
 */
import { persistenceMode, readEnvelope, storageMessage, writeEnvelope } from '../../server-lib/blobStore';
import { jsonResponse, readJsonBody } from '../../server-lib/http';

export async function GET(): Promise<Response> {
  if (persistenceMode() === 'unconfigured') {
    return jsonResponse({ error: storageMessage(), storage: 'unconfigured' }, 503);
  }

  const envelope = await readEnvelope();
  if (!envelope) {
    // Belum ada data di server — klien tetap memakai data lokalnya.
    return jsonResponse({ error: 'Database belum tersedia di server', initialized: false }, 404);
  }

  return jsonResponse(envelope.data);
}

export async function POST(request: Request): Promise<Response> {
  if (persistenceMode() === 'unconfigured') {
    return jsonResponse({ error: storageMessage(), storage: 'unconfigured' }, 503);
  }

  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  const payload = parsed.data;
  if (!payload || typeof payload !== 'object') {
    return jsonResponse({ error: 'Invalid payload: JSON object expected' }, 400);
  }

  try {
    const version = await writeEnvelope(payload);
    return jsonResponse({
      success: true,
      message: 'Database saved successfully',
      version,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return jsonResponse({ error: 'Gagal menyimpan database', details: error?.message }, 500);
  }
}
