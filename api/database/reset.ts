/**
 * Vercel Serverless Function: /api/database/reset
 * POST → kembalikan database ke data demo (seed).
 */
import { persistenceMode, storageMessage, writeEnvelope } from '../../server-lib/blobStore';
import { jsonResponse } from '../../server-lib/http';
import { SEED_DATABASE } from '../../server-lib/seed';

export async function POST(): Promise<Response> {
  if (persistenceMode() === 'unconfigured') {
    return jsonResponse({ error: storageMessage(), storage: 'unconfigured' }, 503);
  }

  try {
    const version = await writeEnvelope(SEED_DATABASE);
    return jsonResponse({
      success: true,
      message: 'Database reset to demo data',
      data: SEED_DATABASE,
      version,
    });
  } catch (error: any) {
    return jsonResponse({ error: 'Gagal reset data demo', details: error?.message }, 500);
  }
}
