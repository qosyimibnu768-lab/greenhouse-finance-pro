/**
 * Vercel Serverless Function: /api/sync/sheets
 * POST → proxy pengiriman payload ke webhook Google Apps Script
 * (menghindari masalah CORS saat dipanggil dari browser).
 */
import { jsonResponse, readJsonBody } from '../../server-lib/http';

export async function POST(request: Request): Promise<Response> {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error }, 400);
  }

  const { webhookUrl, payload } = parsed.data || {};
  if (!webhookUrl) {
    return jsonResponse({ error: 'webhookUrl is required' }, 400);
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    return jsonResponse({ success: response.ok, status: response.status, response: text });
  } catch (error: any) {
    return jsonResponse({ error: error?.message || 'Failed to sync with Google Sheets' }, 500);
  }
}
