/**
 * Test integrasi mode Postgres (Supabase pooler) — memakai database SUNGGUHAN
 * sesuai env SUPABASE_DB_URL (atau SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD).
 *
 * Uji tulis-baca dilakukan di baris terpisah (row id "test-...") lalu DIHAPUS,
 * jadi data produksi (baris "main") tidak tersentuh.
 *
 * Jalankan: npm run test:pg
 */
import assert from 'node:assert/strict';

async function main() {
  const hasEnv = Boolean(
    process.env.SUPABASE_DB_URL ||
      (process.env.SUPABASE_DB_HOST && process.env.SUPABASE_DB_PASSWORD)
  );
  if (!hasEnv) {
    console.log('Skip: env SUPABASE_DB_URL (atau SUPABASE_DB_HOST + SUPABASE_DB_PASSWORD) belum diisi.');
    console.log('Contoh PowerShell:');
    console.log(
      '  $env:SUPABASE_DB_URL="postgresql://postgres.<ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"'
    );
    process.exit(0);
  }

  process.env.GFP_STORAGE = 'pg';
  if (!process.env.SUPABASE_TABLE) process.env.SUPABASE_TABLE = 'gfp_database';
  const testRowId = `test-${Date.now()}`;
  process.env.GFP_ROW_ID = testRowId;

  const store = await import('../server-lib/blobStore.js');

  let passed = 0;
  let failed = 0;
  const check = async (name: string, fn: () => Promise<void> | void) => {
    try {
      await fn();
      passed += 1;
      console.log(`  ✔ ${name}`);
    } catch (error: any) {
      failed += 1;
      console.error(`  ✖ ${name}\n    ${error?.message || error}`);
    }
  };

  console.log('== Adapter Postgres (Supabase) ==');

  await check('mode terdeteksi "pg"', () => {
    assert.equal(store.persistenceMode(), 'pg');
  });

  await check('baris belum ada → readEnvelope null', async () => {
    const envelope = await store.readEnvelope();
    assert.equal(envelope, null);
  });

  await check('tulis (insert) + baca envelope', async () => {
    const version = await store.writeEnvelope({ uji: 'pg', angka: 42, arr: [1, 2, 3] });
    assert.equal(typeof version, 'number');

    const envelope = await store.readEnvelope();
    assert.ok(envelope, 'envelope harus ada');
    assert.equal(envelope!.data.uji, 'pg');
    assert.equal(envelope!.data.angka, 42);
    assert.deepEqual(envelope!.data.arr, [1, 2, 3]);
    assert.equal(envelope!.version, version);
  });

  await check('tulis ulang (update) menaikkan versi', async () => {
    const before = await store.readEnvelope();
    const version = await store.writeEnvelope({ uji: 'pg-v2', angka: 43 });
    const after = await store.readEnvelope();
    assert.ok(after);
    assert.equal(after!.data.angka, 43);
    assert.notEqual(version, before!.version);
  });

  await check('bersihkan baris uji & verifikasi kosong lagi', async () => {
    const { Pool } = (await import('pg')) as any;
    const connectionString =
      process.env.SUPABASE_DB_URL ||
      `postgresql://${encodeURIComponent(process.env.SUPABASE_DB_USER || 'postgres')}:${encodeURIComponent(
        process.env.SUPABASE_DB_PASSWORD || ''
      )}@${process.env.SUPABASE_DB_HOST}:${process.env.SUPABASE_DB_PORT || '6543'}/${process.env.SUPABASE_DB_NAME || 'postgres'}`;
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    await pool.query(`delete from ${process.env.SUPABASE_TABLE || 'gfp_database'} where id = $1`, [testRowId]);
    await pool.end();

    const envelope = await store.readEnvelope();
    assert.equal(envelope, null, 'baris uji harus terhapus');
  });

  console.log(`\nHasil: ${passed} lulus, ${failed} gagal`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
