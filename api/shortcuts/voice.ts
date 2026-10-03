/**
 * Vercel Serverless Function: /api/shortcuts/voice
 * GET  ?text=...        → parse perintah suara & catat transaksi (iPhone Shortcuts)
 * POST { "text": "..." } → sama, untuk web app & Siri
 */
import { ensureEnvelope, persistenceMode, storageMessage, writeEnvelope } from '../../server-lib/blobStore.js';
import { jsonResponse, readJsonBody } from '../../server-lib/http.js';
import {
  buildVoiceTransaction,
  computeBalanceFromTransactions,
  parseVoiceTransaction,
} from '../../server-lib/voiceParser.js';

async function handleVoiceRequest(text: string): Promise<Response> {
  if (!text || !text.trim()) {
    return jsonResponse(
      {
        success: false,
        error: 'Parameter "text" wajib diisi.',
        usage: 'POST /api/shortcuts/voice  body: {"text":"Pengeluaran 150 ribu beli nutrisi AB Mix siklus 1"}',
      },
      400
    );
  }

  if (persistenceMode() === 'unconfigured') {
    return jsonResponse({ success: false, error: storageMessage() }, 503);
  }

  const envelope = await ensureEnvelope();
  if (!envelope) {
    return jsonResponse({ success: false, error: 'Database belum tersedia di server.' }, 500);
  }

  const db = envelope.data;
  const balance = computeBalanceFromTransactions(db?.transactions);
  const parsed = parseVoiceTransaction(text, balance);

  if (!parsed.amount || parsed.amount <= 0) {
    return jsonResponse(
      {
        success: false,
        reply: parsed.siriReply,
        error: 'Nominal rupiah tidak terdeteksi pada teks.',
        parsed,
      },
      400
    );
  }

  const transaction = buildVoiceTransaction(parsed);
  if (!Array.isArray(db.transactions)) db.transactions = [];
  db.transactions.unshift(transaction);
  const version = await writeEnvelope(db);

  return jsonResponse({
    success: true,
    reply: parsed.siriReply,
    source: 'voice-shortcut',
    parsed,
    transaction,
    version,
  });
}

export async function POST(request: Request): Promise<Response> {
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) {
    return jsonResponse({ success: false, error: parsedBody.error }, 400);
  }
  try {
    const text = typeof parsedBody.data?.text === 'string' ? parsedBody.data.text : '';
    return await handleVoiceRequest(text);
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message }, 500);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const text = url.searchParams.get('text') || '';
    return await handleVoiceRequest(text);
  } catch (error: any) {
    return jsonResponse({ success: false, error: error?.message }, 500);
  }
}
