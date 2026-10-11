/**
 * Cek koneksi penyimpanan cloud (Supabase / Upstash / Vercel Blob / lokal).
 *
 * Pemakaian (PowerShell):
 *   $env:SUPABASE_URL="https://xxxx.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="xxxx"
 *   npm run check:storage
 *
 * Skrip ini HANYA membaca — tidak menulis/mengubah data.
 */
import { persistenceMode, readEnvelope, storageMessage } from '../server-lib/blobStore.js';

async function main() {
  const mode = persistenceMode();
  console.log(`Mode penyimpanan aktif: ${mode}`);

  if (mode === 'unconfigured') {
    console.log(`Belum dikonfigurasi. ${storageMessage()}`);
    process.exit(0);
  }

  try {
    const envelope = await readEnvelope();
    if (!envelope) {
      console.log('Penyimpanan terhubung, tetapi BELUM ADA data (baris/kunci kosong).');
      console.log('Buka aplikasi lalu tekan Sinkron — data dari perangkat akan diunggah otomatis.');
      process.exit(0);
    }
    const data = envelope.data || {};
    console.log('Koneksi BERHASIL ✔ Data ditemukan:');
    console.log(`  - versi       : ${envelope.version}`);
    console.log(`  - diperbarui  : ${envelope.updatedAt}`);
    console.log(`  - transaksi   : ${Array.isArray(data.transactions) ? data.transactions.length : '-'}`);
    console.log(`  - investasi   : ${Array.isArray(data.investments) ? data.investments.length : '-'}`);
    console.log(`  - karyawan    : ${Array.isArray(data.employees) ? data.employees.length : '-'}`);
    console.log(`  - absensi     : ${Array.isArray(data.attendances) ? data.attendances.length : '-'}`);
  } catch (error: any) {
    console.error('Koneksi GAGAL ✖');
    console.error(`  ${error?.message || error}`);
    process.exit(1);
  }
}

main();
