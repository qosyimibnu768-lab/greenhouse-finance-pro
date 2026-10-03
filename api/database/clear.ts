/**
 * Vercel Serverless Function: /api/database/clear
 * POST → kosongkan seluruh data usaha (mulai dari nol).
 */
import { buildEmptyDatabase, persistenceMode, storageMessage, writeEnvelope } from '../../server-lib/blobStore';
import { jsonResponse } from '../../server-lib/http';

export async function POST(): Promise<Response> {
  if (persistenceMode() === 'unconfigured') {
    return jsonResponse({ error: storageMessage(), storage: 'unconfigured' }, 503);
  }

  try {
    const empty = buildEmptyDatabase();
    const version = await writeEnvelope(empty);
    return jsonResponse({
      success: true,
      message: 'Database cleared',
      data: empty,
      version,
    });
  } catch (error: any) {
    return jsonResponse({ error: 'Gagal mengosongkan data', details: error?.message }, 500);
  }
}
