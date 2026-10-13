# Arsitektur

```mermaid
flowchart LR
  A[Relawan] --> B[Next.js App Router]
  B --> C[Server actions]
  C --> D[Supabase Auth]
  C --> E[Postgres RPC]
  E --> F[(Postgres + RLS)]
  B --> G[Mode tampil ke anak]
```

- Auth memakai cookie Supabase SSR yang diperbarui oleh `proxy.ts`. Halaman privat memeriksa klaim JWT terverifikasi melalui `getClaims()` dan keanggotaan. Jalur kuis publik tidak melakukan panggilan Auth.
- Pembuatan sesi, simpan jawaban, dan finalisasi memakai RPC database dengan konteks JWT pengguna. RLS tetap membatasi baca serta tabel lain.
- Instrumen `tangga-angka-v1` dan `tangga-angka-v2` tersimpan sebagai level dan soal di database. RPC menyalin snapshot versi terbaru ke sesi; sesi lama tetap memakai versinya sendiri.
- `revision` mencegah tulis bersamaan. `idempotency_key` mencegah duplikasi sesi. Finalisasi mengunci row dan mengembalikan sesi selesai pada retry.
- Komponen layar asesmen menerima snapshot server, lalu menahan antrean sementara hanya dalam memori. Pilihan ini membatasi residu data privat di perangkat bersama, dengan konsekuensi tab harus tetap terbuka saat offline.
- Server action memvalidasi input melalui Zod; RPC memvalidasi ulang status, soal, akses peserta, dan revisi.

Keputusan berikutnya: bila penggunaan offline penuh diperlukan, rancang penyimpanan lokal terenkripsi dengan masa hidup singkat, migrasi key aman, dan prosedur penghapusan perangkat. Implementasi sekarang mendukung koneksi putus sesaat selama tab tetap terbuka.

## Pertemuan kedua

`assessment_answer_events` menyimpan urutan jawaban per soal, termasuk pilihan yang salah sebelum relawan membantu. `assessment_responses` tetap menyimpan status akhir per soal. `assessment_observations.day1_metrics` menyimpan semangat empat kegiatan, lama fokus, dan pengamatan perilaku belajar.

`/mission/[participantId]` menjalankan Kuis Misi lima soal berdasarkan materi yang direkomendasikan dari asesmen terakhir. Aksi server menghitung jawaban benar mandiri dan menyimpan hasil ke `mission_attempts`; layar anak hanya menampilkan pesan selesai tanpa skor. Riwayat dapat ditinjau dari halaman peserta.

## Kuis publik

`/quiz/[slug]` mengambil soal milik tautan tanpa kunci jawaban melalui server. Admin mengedit satu soal per layar pada `/settings/quiz/forms/[id]` setelah tautan ditutup. Jawaban setiap soal diperiksa di server sebelum anak dapat lanjut. Aksi publik memvalidasi nama lengkap, umur angka, pilihan, dan kunci idempotensi; trigger database menolak kiriman yang belum menjawab seluruh soal dengan tepat. Database menyimpan snapshot soal pada kiriman. Tabel soal dan kiriman tidak memberikan hak baca kepada pengunjung anonim. Hasil kuis mandiri disimpan terpisah dari sesi relawan. Admin dapat menautkan kiriman ke peserta secara manual; pencocokan nama otomatis tidak digunakan.

## Super admin

`platform_admins` menyimpan peran platform terpisah dari keanggotaan organisasi. Hanya akun yang tercantum di tabel ini dapat memanggil aksi `/super-admin`. Aksi tersebut memakai secret key pada server setelah memverifikasi JWT dan peran platform. Migrasi `007` mendaftarkan akun pemilik awal berdasarkan email Auth yang sudah dibuat.
