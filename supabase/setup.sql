-- ============================================================
-- Greenhouse Finance Pro — Penyimpanan Database di Supabase
-- Tempel seluruh isi file ini di Supabase → SQL Editor → Run.
-- ============================================================

create table if not exists public.gfp_database (
  id text primary key,
  version bigint not null default 0,
  updated_at timestamptz not null default now(),
  data jsonb not null
);

-- Aktifkan proteksi RLS. Kunci "service_role" tetap punya akses penuh
-- tanpa policy tambahan (dipakai aplikasi di server Vercel).
alter table public.gfp_database enable row level security;

-- OPSIONAL — hanya perlu jika memakai kunci "anon"/publishable (bukan service_role).
-- Buka komentar di bawah ini jika Anda memilih kunci anon:
-- create policy "gfp_select" on public.gfp_database for select using (true);
-- create policy "gfp_insert" on public.gfp_database for insert with check (true);
-- create policy "gfp_update" on public.gfp_database for update using (true);

-- Selesai. Tidak ada data awal yang dimasukkan —
-- aplikasi akan otomatis mengunggah data dari perangkat saat pertama kali Sinkron.
