/**
 * Test adapter Upstash Redis (REST) di server-lib/blobStore.ts
 * Memakai mock server HTTP yang meniru REST API Upstash — tanpa akun asli.
 *
 * Jalankan: npm run test:upstash
 */
import http from 'node:http';
import assert from 'node:assert/strict';

const kv = new Map<string, string>();
let failNextTimes = 0;
let lastAuth = '';

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    lastAuth = String(req.headers.authorization || '');

    if (failNextTimes > 0) {
      failNextTimes -= 1;
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'mock failure' }));
      return;
    }

    let cmd: Array<string | number> = [];
    try {
      cmd = JSON.parse(body);
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'bad request' }));
      return;
    }

    const [op, key, value] = cmd;
    if (op === 'SET') {
      kv.set(String(key), String(value));
      res.end(JSON.stringify({ result: 'OK' }));
      return;
    }
    if (op === 'GET') {
      const has = kv.has(String(key));
      res.end(JSON.stringify({ result: has ? kv.get(String(key)) : null }));
      return;
    }
    res.end(JSON.stringify({ error: `unknown command ${String(op)}` }));
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

  process.env.UPSTASH_REDIS_REST_URL = baseUrl;
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_STORE_ID;
  delete process.env.VERCEL;
  delete process.env.GFP_STORAGE;

  const store = await import('../server-lib/blobStore.js');

  console.log('== Adapter Upstash Redis ==');

  await check('mode otomatis terdeteksi "upstash"', () => {
    assert.equal(store.persistenceMode(), 'upstash');
  });

  await check('GFP_STORAGE=local memaksa mode local-file', () => {
    process.env.GFP_STORAGE = 'local';
    assert.equal(store.persistenceMode(), 'local-file');
    delete process.env.GFP_STORAGE;
  });

  await check('tulis + baca envelope lewat REST (SET/GET)', async () => {
    const version = await store.writeEnvelope({ apples: 5, hello: 'dunia' });
    assert.equal(typeof version, 'number');
    assert.ok(version > 0);

    const envelope = await store.readEnvelope();
    assert.ok(envelope, 'envelope harus ada');
    assert.equal(envelope!.data.apples, 5);
    assert.equal(envelope!.data.hello, 'dunia');
    assert.equal(envelope!.envelopeVersion, 1);
    assert.equal(envelope!.version, version);
  });

  await check('token dikirim sebagai Bearer di header Authorization', () => {
    assert.equal(lastAuth, 'Bearer mock-token');
  });

  await check('key default "greenhouse-finance-pro:database-v2"', () => {
    assert.ok(kv.has('greenhouse-finance-pro:database-v2'), 'key default harus terpakai');
  });

  await check('key belum ada → readEnvelope null (bukan error)', async () => {
    process.env.GFP_REDIS_KEY = 'gfp:kosong';
    const envelope = await store.readEnvelope();
    assert.equal(envelope, null);
  });

  await check('data mentah lama (tanpa envelope) tetap terbaca', async () => {
    process.env.GFP_REDIS_KEY = 'gfp:legacy';
    kv.set('gfp:legacy', JSON.stringify({ transactions: [{ id: 'TX-1' }] }));
    const envelope = await store.readEnvelope();
    assert.ok(envelope, 'envelope hasil bungkus harus ada');
    assert.equal(envelope!.data.transactions[0].id, 'TX-1');
  });

  await check('error server (500) dilempar — TIDAK dianggap data kosong', async () => {
    delete process.env.GFP_REDIS_KEY;
    failNextTimes = 1;
    let threw = false;
    try {
      await store.readEnvelope();
    } catch (error: any) {
      threw = true;
      assert.match(String(error?.message || ''), /Upstash Redis: HTTP 500/);
    }
    assert.ok(threw, 'readEnvelope harus melempar error, bukan mengembalikan null');
  });

  await check('error tulis (500) dilempar dengan pesan jelas', async () => {
    failNextTimes = 1;
    let threw = false;
    try {
      await store.writeEnvelope({ x: 1 });
    } catch (error: any) {
      threw = true;
      assert.match(String(error?.message || ''), /Upstash Redis/);
    }
    assert.ok(threw, 'writeEnvelope harus melempar error');
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
