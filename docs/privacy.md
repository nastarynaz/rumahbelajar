# Privasi dan keamanan

Data peserta bersifat privat. Simpan nama tampilan atau kode, tanpa tanggal lahir atau foto. Catatan hanya untuk perilaku belajar yang terlihat. Jangan menulis nama, jawaban, atau catatan ke analytics, pelacakan error, atau log aplikasi.

## Akses

- `admin` melihat peserta dan sesi dalam organisasinya, menambahkan peserta, serta menugaskan relawan.
- `assessor` melihat peserta yang ditugaskan dan sesi peserta itu saja.
- RLS aktif pada semua tabel privat. Akses lintas organisasi ditolak melalui fungsi `can_access_participant`. Data laporan tetap melewati RLS; agregat disembunyikan jika filter mencakup kurang dari lima peserta.
- Browser hanya menerima publishable key. Secret key untuk undangan tersedia hanya di server action dan tidak boleh berada di repo atau bundle browser.

## Retensi

`organizations.retention_months` menyimpan nilai kebijakan (default 36 bulan). **Penghapusan otomatis belum diaktifkan**; admin harus menyepakati jadwal arsip dan penghapusan sebelum peluncuran operasional. Backup Supabase perlu mengikuti periode retensi yang sama. Hindari export data individual; CSV dan PDF belum tersedia.

## Audit dan risiko

Audit tersimpan untuk pembuatan sesi, perubahan jawaban, perubahan catatan, dan finalisasi. Audit menyimpan kode soal dan metadata tindakan, bukan isi jawaban/catatan. Perlindungan mencakup RLS, foreign key organisasi, kunci idempotensi, revisi, serta snapshot versi instrumen. Risiko tersisa: perangkat relawan yang terbuka, tab offline yang ditutup sebelum tersinkron, dan admin Supabase dengan akses langsung. Terapkan MFA untuk admin dan prosedur keluar dari perangkat bersama.

Sebelum produksi, jalankan uji integrasi RLS pada proyek Supabase tersendiri dengan dua organisasi, dua assessor, dan seorang admin; verifikasi bahwa assessor tidak membaca peserta di luar penugasan serta tidak dapat menyisipkan respons langsung. Uji ini memerlukan database dan kredensial uji, sehingga belum dijalankan tanpa `.env`.

## Kuis mandiri

Kuis publik mengumpulkan nama lengkap dan umur angka sesuai kebutuhan produk; tanggal lahir, alamat, dan foto tidak dikumpulkan. Pengunjung tidak memperoleh hak baca tabel kiriman. Kunci jawaban dan secret key hanya berada di server. Hash IP dipakai untuk membatasi kiriman dan tidak menyimpan IP mentah. Tabel pembatas perlu dibersihkan secara berkala melalui tugas database, misalnya `delete from public.public_quiz_rate_limits where window_start < now() - interval '30 days';` setiap hari. Pembersihan ini tidak dilakukan saat anak mengirim jawaban agar kiriman tetap cepat. Admin perlu membagikan tautan hanya melalui kanal yang sesuai dan menutupnya setelah periode posttest selesai. Penautan kiriman ke profil peserta dilakukan manual dan dicatat di audit log agar nama yang sama tidak otomatis digabung.
