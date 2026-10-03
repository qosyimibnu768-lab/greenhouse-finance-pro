# Greenhouse Finance Pro

Aplikasi profesional manajemen keuangan, investasi, siklus tanam, panen, stok bahan, presensi & payroll staf, serta analisis BEP/ROI khusus perkebunan greenhouse melon DFT modern.

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

### Opsi A — Render.com (paling mudah)

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

### Opsi B — Railway / Fly.io / VPS (pakai Docker)

Proyek ini sudah dilengkapi `Dockerfile`:

```bash
docker build -t greenhouse-finance-pro .
docker run -p 3000:3000 -v gfp-data:/app/data greenhouse-finance-pro
```

- `-v gfp-data:/app/data` membuat volume agar data tersimpan permanen.
- Cocok untuk Railway, Fly.io, VPS (Vercel/Netlify tidak cocok karena butuh server Node).

### Environment Variable

| Variabel           | Wajib | Keterangan                                    |
| ------------------ | ----- | --------------------------------------------- |
| `PORT`             | Tidak | Port server (default `3000`; hosting mengisi otomatis) |
| `NODE_ENV`         | Ya (saat deploy) | Set `production` agar frontend di-serve dari `dist/` |
| `GEMINI_API_KEY`   | Tidak | Mengaktifkan fitur AI (parser suara)           |

---

## 4. Struktur Singkat

```
├── server.ts              # Server Express (API + serve frontend)
├── src/                   # Kode React (halaman, komponen, context)
├── data/greenhouse_db.json# Database JSON (tersimpan otomatis)
├── Dockerfile             # Siap deploy via Docker
├── render.yaml            # Konfigurasi deploy Render.com
└── Jalankan Aplikasi.bat  # Peluncur lokal Windows
```
