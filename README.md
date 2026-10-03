# Rumah Belajar · Tangga Angka

Aplikasi privat untuk relawan menjalankan asesmen numerasi satu per satu. Anak melihat kartu soal; relawan mencatat jawaban. Hasil merupakan level tertinggi yang memenuhi ambang soal inti, bukan nilai peringkat.

## Menjalankan

1. `pnpm install`
2. Buat proyek Supabase. Jalankan migrasi di `supabase/migrations/` sesuai urutan nama file melalui Supabase CLI atau SQL editor. Jangan ubah PDF pada folder `../data/`.
3. Salin `.env.example` menjadi `.env.local`, lalu isi URL proyek, **publishable key**, URL situs, dan **secret key hanya di server** untuk undangan tim. Jangan beri prefix `NEXT_PUBLIC_` pada secret key.
4. Di Supabase Auth, aktifkan email OTP. Atur **Site URL** ke alamat aplikasi (misalnya `http://localhost:3000` saat lokal) dan tambahkan `<alamat-aplikasi>/auth/confirm` ke **Redirect URLs**. Samakan `NEXT_PUBLIC_SITE_URL` dengan alamat aplikasi tersebut.
5. Atur template email **Magic Link** dan **Invite User** seperti di bawah. Untuk pengiriman email produksi, pasang custom SMTP di Supabase Auth.
6. Buat admin pertama melalui langkah di bawah.
7. Jalankan `pnpm dev`, buka `/login`.

### Tautan email untuk login

Di **Authentication → Email Templates**, ubah tautan tombol pada template **Magic Link** menjadi:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Masuk ke Rumah Belajar</a>
```

Pada template **Invite User**, gunakan:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Terima undangan</a>
```

Callback aplikasi memverifikasi token dan membuat sesi di cookie. Tautan bawaan Supabase yang memakai fragmen URL tidak dapat diproses oleh callback server ini.

### Admin pertama

Di Supabase Dashboard, buat atau undang akun email pertama melalui Auth. Setelah akun muncul di `auth.users`, jalankan di SQL editor dengan mengganti UUID pengguna dan nama organisasi:

```sql
insert into public.organizations(name) values ('Rumah Belajar') returning id;
-- Pakai id organisasi dari hasil di atas.
insert into public.organization_members(organization_id,user_id,role)
values ('UUID_ORGANISASI','UUID_USER_AUTH','admin');
```

Trigger migrasi membuat `profiles` untuk akun Auth baru. Untuk relawan berikutnya, admin mengirim undangan dan mengatur penugasan di `/settings/team`. Jangan mengaktifkan pendaftaran email bebas.

## Alur

`/login` → `/dashboard` → `/participants` → `/assessments/new` → `/assessments/[id]/run` → `/assessments/[id]/review` → `/assessments/[id]/result`. `/reports` menampilkan agregat hanya jika ada minimal lima peserta berbeda dalam filter. Admin juga memiliki `/settings/participants`, `/settings/team`, dan `/settings/instrument`.

Draft jawaban disimpan ke database per tindakan. Jika koneksi terputus, tab menahan antrean jawaban di memori dan mencoba lagi saat online. **Jangan tutup tab ketika status masih “Belum tersinkron”.** Data anak tidak ditulis ke localStorage atau sessionStorage. Dua perangkat pada sesi yang sama akan menerima konflik revisi, lalu perlu memuat ulang.

## Verifikasi

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm exec next build --webpack`

Build webpack tersedia untuk lingkungan yang membatasi port proses internal Turbopack. Setelah `.env.local` dan proyek Supabase tersedia, uji login, pembuatan sesi, koreksi jawaban, finalisasi, serta isolasi RLS dengan dua akun organisasi berbeda sebelum peluncuran.

## Deployment

Deploy Next.js ke Vercel, isi variabel lingkungan yang sama dengan URL produksi, lalu tambahkan URL callback produksi di Supabase Auth. Jalankan migrasi sebelum mengarahkan pengguna. Konfigurasikan backup database dan review retensi data sesuai `docs/privacy.md`.

Dokumen: [arsitektur](docs/architecture.md), [privasi](docs/privacy.md), [aturan asesmen](docs/assessment-rules.md).

### Uji isolasi database

`supabase/tests/rls.psql` adalah pemeriksaan read-only yang harus dijalankan di database uji dengan dua organisasi, satu admin dan assessor organisasi A, serta satu peserta masing-masing organisasi. Ia memeriksa isolasi baris, bahwa penyisipan sesi/jawaban langsung tidak diberikan kepada `authenticated`, dan bahwa tabel kiriman kuis tidak dapat dibaca `anon`. Gunakan `psql` dengan `-v assessor_a=... -v admin_a=... -v participant_a=... -v participant_b=...`. Belum dapat dijalankan di workspace ini karena proyek Supabase dan akun uji belum tersedia.

## Posttest mandiri

Admin membuka `/settings/quiz`, membuat tautan `Posttest Numerasi`, lalu membagikannya. Anak membuka `/quiz/[slug]` tanpa login, mengisi **nama lengkap dan umur angka**, menjawab 12 soal pilihan, lalu mendapat konfirmasi pengiriman. Soal boleh dilewati. Admin melihat daftar kiriman dan skor di `/settings/quiz`, lalu dapat menautkan kiriman ke peserta setelah memeriksa identitas. Riwayat yang sudah ditautkan muncul pada profil peserta. Kuis mandiri adalah instrumen `kuis-numerasi-v1` yang berbeda dari asesmen Tangga Angka oleh relawan; skornya tidak dikonversi menjadi level A–F.

Tautan memakai slug acak dan dapat ditutup admin. Kunci jawaban tidak dikirim ke browser. Submisi melewati validasi server, batas 100 kiriman per jam per hash IP dan tautan (agar perangkat pada jaringan bersama tetap dapat mengisi), serta kunci idempotensi. Nama, umur, jawaban, dan skor hanya dapat dibaca admin organisasi. Secret key Supabase wajib tersedia hanya di server untuk membuka kuis publik dan memproses submisi.

Setelah migrasi, jalankan `supabase/tests/migration_smoke.sql` di SQL Editor untuk memeriksa jumlah soal, status RLS, dan hak akses dasar. `supabase/tests/rls.psql` memerlukan akun uji lintas organisasi untuk memeriksa isolasi baris.
