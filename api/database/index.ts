/**
 * Vercel Serverless Function: /api/database
 * GET  → baca database
 * POST → simpan seluruh database (dipakai aplikasi setiap ada perubahan)
 */
import { isStoreSuspendedError, persistenceMode, readEnvelope, storageMessage, writeEnvelope } from '../../server-lib/blobStore.js';
import { jsonResponse, readJsonBody } from '../../server-lib/http.js';

export async function GET(): Promise<Response> {
  if (persistenceMode() === 'unconfigured') {
    return jsonResponse({ error: storageMessage(), storage: 'unconfigured' }, 503);
  }

  let envelope: Awaited<ReturnType<typeof readEnvelope>> = null;
  try {
    envelope = await readEnvelope();
  } catch (error: any) {
    if (isStoreSuspendedError(error)) {
      return jsonResponse(
        {
          error:
            'Penyimpanan cloud Vercel (Blob) sedang di-suspend oleh Vercel. Data Anda tidak hilang — buka Vercel Dashboard → Storage untuk memulihkannya.',
          suspended: true,
        },
        503
      );
    }
    return jsonResponse({ error: 'Gagal membaca database dari cloud', details: error?.message }, 500);
  }

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
    return jsonResponse(
      { error: 'Gagal menyimpan database', details: error?.message, suspended: isStoreSuspendedError(error) },
      500
    );
  }
}
