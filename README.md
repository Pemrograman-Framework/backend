# Anna Brew PO Management

Aplikasi manajemen purchase order berbasis Next.js App Router.

## Menjalankan aplikasi

```bash
npm install
npm run dev
```

Buka terminal kedua untuk menjalankan API:

```bash
npm run dev:backend
```

Web tersedia di `http://localhost:3000` dan API di `http://localhost:4000/api`. Jika port 3000 sudah digunakan, Next.js dapat memilih port 3001; API development menerima kedua origin localhost tersebut. Backend menyimpan data aplikasi di MySQL; file JSON lama digunakan untuk impor awal bila tabel database masih kosong.

## Database MySQL

Buat database melalui phpMyAdmin, atau jalankan SQL berikut:

```sql
CREATE DATABASE anna_brew CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Salin `backend/.env.example` menjadi `backend/.env`, lalu isi kredensial MySQL. Saat backend dijalankan, tabel `purchase_orders`, `purchase_order_items`, `purchase_order_logs`, `suppliers`, `products`, `users`, dan `discrepancies` dibuat otomatis beserta tabel pencatatan versi skema. Jika belum ada skema aplikasi, data dari `anna_brew_data` lama atau `backend/data/anna-brew.json` diimpor satu kali. Tabel lama dipertahankan sebagai cadangan migrasi; setelah impor, tabel-tabel baru menjadi sumber data utama dan perubahan tidak ditulis kembali ke file JSON.

Perintah produksi:

```bash
npm run build
npm start
```

Untuk memeriksa backend, gunakan `npm run build:backend`; jalankan layanan produksinya dengan `npm run start:backend`.

## Akun demo

- Email: `ayupatricia@gmail.com`
- Kata sandi: `Anna2026!`

Sesi pengguna disimpan di `localStorage` browser. Data PO, supplier, produk, pengguna, dan discrepancy dimuat dari backend dan disimpan ke MySQL. Login demo divalidasi oleh API; kredensial demo tersedia di bawah.

Konfigurasi backend berada di `backend/.env`. Untuk deployment, atur `SESSION_SECRET` ke nilai acak yang panjang, `DEMO_PASSWORD` ke password yang aman, dan `CLIENT_ORIGIN` ke origin frontend. Akun serta password bawaan ditujukan untuk demonstrasi lokal, bukan autentikasi produksi.
