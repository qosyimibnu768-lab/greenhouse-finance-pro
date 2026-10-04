# Greenhouse Finance Pro

Aplikasi profesional manajemen keuangan, investasi, siklus tanam, panen, stok bahan, presensi & payroll staf, serta analisis BEP/ROI khusus perkebunan greenhouse melon Premium modern.

---

## 1. Menjalankan Secara Lokal (Windows)

**Cara termudah:** klik dua kali file **`Jalankan Aplikasi.bat`** — server akan menyala dan browser terbuka otomatis di <http://localhost:3000>.

Atau lewat terminal:

```bash
npm install
npm run dev
```

**Akun default:**

| Username | Password  | Peran          |
| -------- | --------- | -------------- |
| `ibnu`   | `ibnu123` | Owner / Super Admin |

Data tersimpan otomatis ke file `data/greenhouse_db.json` (persisten di komputer).

---

## 2. Build Versi Produksi

```bash
npm install
npm run build

# Windows:
set NODE_ENV=production && npm start

# Linux / macOS:
NODE_ENV=production npm start
```

Server melayani frontend (hasil build `dist/`) dan API dalam satu port (`PORT`, default `3000`).

---

## 3. Deploy Online

### Opsi A — Vercel (sinkronisasi HP ↔ PC penuh)

Di Vercel, aplikasi berjalan sebagai **frontend statis + Vercel Serverless Functions** (`folder api/`) + penyimpanan **Vercel Blob**.

1. Push proyek ke GitHub (Vercel akan otomatis build & deploy):

   ```bash
   git add -A
   git commit -m "Update aplikasi"
   git push
   ```

2. Buka [Vercel Dashboard](https://vercel.com) → pilih project ini → tab **Storage** → **Create** → pilih **Blob** → buat store dengan akses **Private** (disarankan untuk data keuangan) atau **Public** — keduanya dideteksi otomatis oleh aplikasi — lalu hubungkan ke project (centang environment **Production**, dan **Preview** bila perlu).

3. Buka tab **Deployments** → deployment terakhir → menu **⋯** → **Redeploy** (agar variabel penyimpanan ikut aktif ke fungsi).

4. Selesai. Klik tombol **Sinkron** di aplikasi — jika muncul toast *"Sinkronisasi Berhasil"*, sinkronisasi multi-perangkat sudah aktif.

> **Tanpa langkah 2–3:** aplikasi tetap berjalan normal di Vercel, tetapi data hanya
> tersimpan di browser masing-masing (localStorage) dan tombol Sinkron menampilkan
> pesan gagal secara jujur. Tidak ada data yang hilang — begitu Blob dihubungkan dan
> aplikasi dibuka, data perangkat itu otomatis diunggah sebagai sumber awal cloud
> (atau menarik data terbaru bila cloud sudah berisi).
>
> **Batas ukuran:** serverless Vercel membatasi body request ±4,5 MB per penyimpanan.
> Hindari menyimpan banyak foto nota berukuran besar agar database tetap ringan.

### Opsi B — Render.com (server Express penuh, tanpa Blob)

1. Upload folder proyek ini ke sebuah repository GitHub.
2. Buka <https://render.com> → **New** → **Web Service** → pilih repo tersebut.
3. Render akan otomatis membaca file `render.yaml`. Jika mengisi manual:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:** `NODE_ENV=production`
4. (Opsional) Tambahkan `GEMINI_API_KEY` bila ingin fitur AI/voice aktif.
5. Klik **Deploy** — aplikasi online dalam beberapa menit.

> **Penting soal data:** `data/greenhouse_db.json` tersimpan di filesystem server.
> Agar data **tidak hilang** saat restart/redeploy, pasang **Persistent Disk**
> (mount ke `data/`) — tersedia di paket berbayar Render. Tanpa disk, data akan
> kembali ke contoh awal setiap kali server restart (paket free).

### Opsi C — Railway / Fly.io / VPS (pakai Docker)

Proyek ini sudah dilengkapi `Dockerfile`:

```bash
docker build -t greenhouse-finance-pro .
docker run -p 3000:3000 -v gfp-data:/app/data greenhouse-finance-pro
```

- `-v gfp-data:/app/data` membuat volume agar data tersimpan permanen.
- Cocok untuk Railway, Fly.io, VPS.

### Environment Variable

| Variabel         | Wajib            | Keterangan                                              |
| ---------------- | ---------------- | ------------------------------------------------------- |
| `PORT`           | Tidak            | Port server (default `3000`; hosting mengisi otomatis)  |
| `NODE_ENV`       | Ya (Express)     | Set `production` agar frontend di-serve dari `dist/`    |
| `GEMINI_API_KEY` | Tidak            | Mengaktifkan fitur AI (parser suara)                    |
| `BLOB_*`         | Otomatis (Vercel) | Diisi otomatis oleh Vercel saat Blob store dihubungkan |

---

## 4. API Server (untuk Integrasi Lanjutan)

Endpoint tersedia di server Express (lokal/Render/Docker) **dan** di Vercel sebagai Serverless Functions (folder `api/`):

| Endpoint | Metode | Fungsi |
| --- | --- | --- |
| `/api/health` | GET | Status server |
| `/api/database` | GET / POST | Baca / simpan seluruh database |
| `/api/sync/version` | GET | Nomor versi data (untuk sinkronisasi) |
| `/api/sync/events` | GET | SSE real-time (di Vercel otomatis beralih ke polling) |
| `/api/database/reset` | POST | Kembalikan ke data demo (`greenhouse_db.seed.json`) |
| `/api/database/clear` | POST | Kosongkan semua data |
| `/api/sync/sheets` | POST | Proxy kirim data ke webhook Google Sheets |
| `/api/shortcuts/voice` | GET / POST | Parser perintah suara Bahasa Indonesia (iPhone Shortcuts/Siri) |

Contoh mencatat transaksi lewat suara:

```bash
curl -X POST "http://localhost:3000/api/shortcuts/voice" \
  -H "Content-Type: application/json" \
  -d '{"text": "Pengeluaran 150 ribu beli nutrisi AB Mix siklus 1"}'
```

> Di Vercel, endpoint di atas membutuhkan Blob store. Bila belum dihubungkan,
> endpoint membalas `503` dengan pesan yang jelas dan aplikasi otomatis memakai
> data lokal di browser.

---

## 5. Struktur Singkat

```
├── server.ts               # Server Express (lokal / Render / Docker)
├── server-lib/             # Parser suara & penyimpanan (dipakai bersama)
├── api/                    # Vercel Serverless Functions (produksi Vercel)
├── src/                    # Kode React (halaman, komponen, context)
├── data/greenhouse_db.json      # Database lokal
├── data/greenhouse_db.seed.json # Data demo untuk fitur reset
├── vercel.json             # Konfigurasi deploy Vercel
├── Dockerfile              # Siap deploy via Docker
├── render.yaml             # Konfigurasi deploy Render.com
└── Jalankan Aplikasi.bat   # Peluncur lokal Windows
```

---

## 6. Pengujian Endpoint (opsional)

```bash
npm run test:api   # menguji semua endpoint serverless (19 skenario)
```
