/**
 * Tes integrasi handler Vercel Serverless Functions (tanpa deploy).
 * Menjalankan semua endpoint dengan penyimpanan local-file (GFP_LOCAL_DB = file sementara).
 *
 * Jalankan: npx tsx scripts/test-api.ts
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

// Arahkan penyimpanan ke file sementara SEBELUM handler dipakai
const tempDbPath = path.join(os.tmpdir(), `gfp-test-db-${Date.now()}.json`);
fs.copyFileSync(path.join(process.cwd(), 'data', 'greenhouse_db.seed.json'), tempDbPath);
process.env.GFP_LOCAL_DB = tempDbPath;
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.BLOB_STORE_ID;
delete process.env.VERCEL_OIDC_TOKEN;
delete process.env.VERCEL;

import { GET as dbGet, POST as dbPost } from '../api/database/index';
import { POST as resetPost } from '../api/database/reset';
import { POST as clearPost } from '../api/database/clear';
import { GET as versionGet } from '../api/sync/version';
import { GET as eventsGet } from '../api/sync/events';
import { POST as sheetsPost } from '../api/sync/sheets';
import { GET as voiceGet, POST as voicePost } from '../api/shortcuts/voice';

let pass = 0;
let fail = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    pass += 1;
    console.log(`  ✔ ${name}`);
  } else {
    fail += 1;
    console.error(`  ✘ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const jsonReq = (url: string, method: string, body?: any) =>
  new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function main() {
  console.log('== /api/database ==');
  const dbRes = await dbGet();
  const db = await dbRes.json();
  check('GET mengembalikan 200', dbRes.status === 200, `status=${dbRes.status}`);
  check('berisi 28 transaksi demo', db.transactions?.length === 28, `jumlah=${db.transactions?.length}`);

  const versionBefore = (await (await versionGet()).json()).version;
  check('version terisi', typeof versionBefore === 'number' && versionBefore > 0, String(versionBefore));

  const payload = JSON.parse(JSON.stringify(db));
  payload.transactions.push({ id: 'TRX-TEST-API', type: 'pengeluaran', amount: 12345, category: 'Lainnya', date: '2026-10-03', createdAt: new Date().toISOString(), tunnel: 'Tunnel 1' });
  const saveRes = await dbPost(jsonReq('http://local/api/database', 'POST', payload));
  const saveBody = await saveRes.json();
  check('POST menyimpan database', saveRes.status === 200 && saveBody.success === true, JSON.stringify(saveBody).slice(0, 120));
  check('version naik setelah simpan', saveBody.version !== versionBefore);

  const dbAfterSave = await (await dbGet()).json();
  check('transaksi tambahan tersimpan', dbAfterSave.transactions.some((t: any) => t.id === 'TRX-TEST-API'));

  console.log('== /api/database/reset & clear ==');
  const resetRes = await resetPost();
  const resetBody = await resetRes.json();
  check('reset mengembalikan 28 transaksi demo', resetRes.status === 200 && resetBody.data?.transactions?.length === 28);
  const clearRes = await clearPost();
  const clearBody = await clearRes.json();
  check('clear mengosongkan data', clearRes.status === 200 && clearBody.data?.transactions?.length === 0);
  await resetPost();

  console.log('== /api/sync/version & events ==');
  const v1 = (await (await versionGet()).json()).version;
  await voicePost(jsonReq('http://local/api/shortcuts/voice', 'POST', { text: 'Pengeluaran 25 ribu beli pestisida siklus 1' }));
  const v2 = (await (await versionGet()).json()).version;
  check('version berubah setelah transaksi baru', v2 !== v1, `v1=${v1} v2=${v2}`);
  const eventsRes = await eventsGet();
  check('events membalas text/event-stream', eventsRes.status === 200 && (eventsRes.headers.get('content-type') || '').includes('text/event-stream'));
  await resetPost();

  console.log('== /api/shortcuts/voice ==');
  const voiceRes = await voicePost(jsonReq('http://local/api/shortcuts/voice', 'POST', { text: 'Pengeluaran 150 ribu beli nutrisi AB Mix siklus 2' }));
  const voice = await voiceRes.json();
  check('POST suara berhasil', voiceRes.status === 200 && voice.success === true, JSON.stringify(voice).slice(0, 140));
  check('nominal 150000 terdeteksi', voice.parsed?.amount === 150000, String(voice.parsed?.amount));
  check('kategori AB Mix', voice.parsed?.category === 'AB Mix', String(voice.parsed?.category));
  check('siklus S002 terdeteksi', voice.parsed?.cycleId === 'S002', String(voice.parsed?.cycleId));
  check('transaksi tersimpan di database', typeof voice.transaction?.id === 'string');

  const getVoiceRes = await voiceGet(new Request('http://local/api/shortcuts/voice?text=Pemasukan%205%20juta%20penjualan%20melon%20tunnel%201'));
  const getVoice = await getVoiceRes.json();
  check('GET suara pemasukan 5 juta', getVoiceRes.status === 200 && getVoice.success === true && getVoice.parsed?.amount === 5000000 && getVoice.parsed?.type === 'pemasukan');

  const badVoiceRes = await voicePost(jsonReq('http://local/api/shortcuts/voice', 'POST', { text: 'halo selamat pagi' }));
  const badVoice = await badVoiceRes.json();
  check('teks tanpa nominal ditolak 400 JSON', badVoiceRes.status === 400 && badVoice.success === false && typeof badVoice.reply === 'string');

  const malformedRes = await voicePost(new Request('http://local/api/shortcuts/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'bukan-json' }));
  const malformed = await malformedRes.json();
  check('body JSON rusak ditolak 400 JSON', malformedRes.status === 400 && typeof malformed.error === 'string');

  console.log('== /api/sync/sheets ==');
  const sheetsRes = await sheetsPost(jsonReq('http://local/api/sync/sheets', 'POST', {}));
  check('tanpa webhookUrl ditolak 400', sheetsRes.status === 400);

  // Bereskan
  await resetPost();
  fs.rmSync(tempDbPath, { force: true });

  console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Tes crash:', err);
  process.exit(1);
});
