# Portal Dwisma — SMAN 2 Mengwi

Portal aplikasi sekolah + panel admin untuk mengelola tautan aplikasi, gambar, kalender, guru,
sumber data (scraping), dan asisten AI (DeepSeek).

## Fitur

- **Portal publik** (`/`): dirender dari daftar **blok halaman** yang terurut, meliputi navbar, hero,
  pencarian, kalender akademik, aplikasi sekolah, berita, banner, lokasi, teks/HTML kustom, footer,
  chat AI, dan status layanan (Uptime Kuma).
- **Panel admin** (`/admin`): login multi-user dengan role `admin` / `editor`.
  - **Tata letak blok halaman**: tambah, geser (drag & drop), aktif/nonaktif, dan hapus blok.
    Blok aplikasi (tombol) dan blok Teks/HTML dapat ditambah lebih dari satu; blok struktural
    (navbar, footer, chat) hanya dapat diaktifkan/nonaktifkan.
  - CRUD tombol aplikasi (nama, deskripsi, URL, ikon, logo/gambar, tema warna, urutan, status).
  - CRUD kalender, guru, dan pengguna.
  - Unggah & kelola gambar.
  - Pengaturan sumber scraping (URL + selector) dengan tombol **Test**.
  - Pengaturan AI DeepSeek (API key, model, system prompt) + test koneksi.
  - Pengaturan identitas situs dan status layanan.

> Blok aplikasi (`apps`) dapat dikelola editor; blok konten/struktural dan pengaturan urutan hanya admin.
- **Database SQLite** berbasis query, tersimpan di Docker volume.
- **Asisten AI DeepSeek** dengan konteks otomatis dari data sekolah.

## Struktur

```
backend/   Server Express + SQLite + API
public/    Frontend statis (portal + admin)
data/      Seed awal (aplikasi.json, kalender.json, guru.json)
```

## Menjalankan

1. Salin konfigurasi lingkungan:

   ```bash
   cp .env.example .env
   ```

   Edit `.env`, minimal isi `SESSION_SECRET`, `ADMIN_USERNAME`, dan `ADMIN_PASSWORD`.

2. Jalankan:

   ```bash
   docker compose up -d --build
   ```

3. Buka `http://127.0.0.1:8080` (portal) dan `http://127.0.0.1:8080/admin` (admin).

Saat pertama kali dijalankan, database dibuat otomatis di volume `dwisma_data` dan diisi dari
file seed di folder `data/`. Akun admin dibuat dari `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

## Menghubungkan DeepSeek

1. Login ke `/admin` lalu buka tab **AI & Situs**.
2. Isi **DeepSeek API Key**, pilih model (default `deepseek-chat`).
3. Klik **Test Koneksi**, lalu **Simpan Pengaturan**.

API key dapat juga diisi lewat variabel `DEEPSEEK_API_KEY` pada `.env` (dipakai saat seed pertama).

## Mengatur sumber scraping

Tab **Sumber Data** memungkinkan pengaturan penuh tanpa mengubah kode:

- `list` — daftar berita/prestasi: selector item, judul, tanggal, ringkasan, link, gambar, batas.
- `pairs` — pasangan nama/nilai (contoh: wakasek).
- `tables` — tabel key-value (contoh: profil sekolah).
- `website` — profil halaman utama sekolah.

Gunakan tombol **Test** untuk melihat hasil pengambilan data secara langsung.

## Volume & data

- `dwisma_data` → `/data` berisi `dwisma.db` dan folder `uploads/`.
- Folder `data/` di repo hanya dipakai sebagai seed awal (read-only di dalam container).

## Reset database

```bash
docker compose down
docker volume rm dwisma_data
docker compose up -d --build
```
