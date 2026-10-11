/**
 * Test adapter Supabase (PostgREST via REST) di server-lib/blobStore.ts
 * Memakai mock server HTTP yang meniru REST API Supabase — tanpa akun asli.
 *
 * Jalankan: npm run test:supabase
 */
import http from 'node:http';
import assert from 'node:assert/strict';

// rows: key = `${table}:${id}` → { version, updated_at, data }
const rows = new Map<string, any>();
const KNOWN_TABLES = new Set(['gfp_database']);
let failNextRead = false;
let failNextWrite = false;
let lastHeaders: Record<string, any> = {};
let lastPath = '';

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    lastHeaders = req.headers as any;
    lastPath = String(req.url || '');

    const url = new URL(String(req.url || '/'), 'http://localhost');
    const match = url.pathname.match(/^\/rest\/v1\/([^/]+)$/);
    const table = match ? decodeURIComponent(match[1]) : '';

    if (!KNOWN_TABLES.has(table)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ code: '42P01', message: `relation "public.${table}" does not exist` }));
      return;
    }

    if (req.method === 'GET') {
      if (failNextRead) {
        failNextRead = false;
        res.statusCode = 500;
        res.end(JSON.stringify({ message: 'mock internal error' }));
        return;
      }
      const idFilter = url.searchParams.get('id') || '';
      const wantedId = idFilter.startsWith('eq.') ? idFilter.slice(3) : '';
      const row = rows.get(`${table}:${wantedId}`);
      res.statusCode = 200;
      res.end(JSON.stringify(row ? [{ version: row.version, data: row.data, updated_at: row.updated_at }] : []));
      return;
    }

    if (req.method === 'POST') {
      if (failNextWrite) {
        failNextWrite = false;
        res.statusCode = 500;
        res.end(JSON.stringify({ message: 'mock write error' }));
        return;
      }
      const prefer = String(req.headers.prefer || '');
      if (!prefer.includes('merge-duplicates')) {
        res.statusCode = 409;
        res.end(JSON.stringify({ code: '23505', message: 'duplicate key value violates unique constraint' }));
        return;
      }
      let payload: any = null;
      try {
        payload = JSON.parse(body);
      } catch {
        payload = null;
      }
      if (!payload || typeof payload !== 'object') {
        res.statusCode = 400;
        res.end(JSON.stringify({ message: 'bad json' }));
        return;
      }
      rows.set(`${table}:${payload.id}`, {
        version: payload.version,
        updated_at: payload.updated_at,
        data: payload.data,
      });
      res.statusCode = 201;
      res.end('');
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ message: 'method not allowed' }));
  });
});

let passed = 0;
let failed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  ✔ ${name}`);
    })
    .catch((error) => {
      failed += 1;
      console.error(`  ✖ ${name}\n    ${error?.message || error}`);
    });
}

async function main() {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  process.env.SUPABASE_URL = baseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
  process.env.UPSTASH_REDIS_REST_URL = 'http://127.0.0.1:1';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-upstash-token';
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL;
  delete process.env.GFP_STORAGE;

  const store = await import('../server-lib/blobStore.js');

  console.log('== Adapter Supabase ==');

  await check('mode otomatis terdeteksi "supabase" (diprioritaskan di atas Upstash)', () => {
    assert.equal(store.persistenceMode(), 'supabase');
  });

  await check('GFP_STORAGE=upstash memaksa mode upstash', () => {
    process.env.GFP_STORAGE = 'upstash';
    assert.equal(store.persistenceMode(), 'upstash');
  });

  await check('GFP_STORAGE=local memaksa mode local-file', () => {
    process.env.GFP_STORAGE = 'local';
    assert.equal(store.persistenceMode(), 'local-file');
    delete process.env.GFP_STORAGE;
  });

  await check('tulis + baca baris JSONB (POST upsert & GET)', async () => {
    const version = await store.writeEnvelope({ melon: 12, note: 'tes supabase' });
    assert.equal(typeof version, 'number');

    const envelope = await store.readEnvelope();
    assert.ok(envelope, 'envelope harus ada');
    assert.equal(envelope!.data.melon, 12);
    assert.equal(envelope!.data.note, 'tes supabase');
    assert.equal(envelope!.version, version);
  });

  await check('request memakai tabel gfp_database & row id "main"', () => {
    assert.ok(lastPath.includes('/rest/v1/gfp_database'), `path: ${lastPath}`);
    assert.ok(lastPath.includes('id=eq.main'), `path: ${lastPath}`);
  });

  await check('header apikey + Authorization Bearer terkirim', () => {
    assert.equal(lastHeaders['apikey'], 'mock-service-key');
    assert.equal(lastHeaders['authorization'], 'Bearer mock-service-key');
  });

  await check('upsert memakai Prefer: resolution=merge-duplicates (tanpa error 409)', async () => {
    const before = (rows.get('gfp_database:main') || {}).version;
    const version = await store.writeEnvelope({ melon: 13 });
    assert.notEqual(version, before);
    assert.equal((rows.get('gfp_database:main') || {}).data.melon, 13);
  });

  await check('baris belum ada → readEnvelope null (bukan error)', async () => {
    process.env.GFP_ROW_ID = 'kosong';
    const envelope = await store.readEnvelope();
    assert.equal(envelope, null);
    delete process.env.GFP_ROW_ID;
  });

  await check('tabel belum dibuat (404) → pesan "belum ada"', async () => {
    process.env.SUPABASE_TABLE = 'gfp_tabel_hilang';
    let threw = false;
    try {
      await store.readEnvelope();
    } catch (error: any) {
      threw = true;
      assert.match(String(error?.message || ''), /belum ada/);
    }
    assert.ok(threw, 'harus melempar error tabel belum ada');
    delete process.env.SUPABASE_TABLE;
  });

  await check('error server saat baca (500) dilempar — TIDAK dianggap data kosong', async () => {
    failNextRead = true;
    let threw = false;
    try {
      await store.readEnvelope();
    } catch (error: any) {
      threw = true;
      assert.match(String(error?.message || ''), /Supabase: HTTP 500/);
    }
    assert.ok(threw, 'readEnvelope harus melempar error');
  });

  await check('error tulis (500) dilempar dengan pesan jelas', async () => {
    failNextWrite = true;
    let threw = false;
    try {
      await store.writeEnvelope({ x: 1 });
    } catch (error: any) {
      threw = true;
      assert.match(String(error?.message || ''), /gagal menyimpan/);
    }
    assert.ok(threw, 'writeEnvelope harus melempar error');
  });

  await check('fallback ke SUPABASE_ANON_KEY bila service role kosong', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
    assert.equal(store.persistenceMode(), 'supabase');
    await store.readEnvelope();
    assert.equal(lastHeaders['apikey'], 'mock-anon-key');
    delete process.env.SUPABASE_ANON_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';
  });

  server.close();
  console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  server.close();
  process.exit(1);
});
