import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { Shell } from "@/components/product/shell"
import { Button } from "@/components/ui/button"

const rundown = [
  ["12.40", "Siapkan dua meja, kartu, kancing, dan Peta Pulau."],
  ["13.00", "Salam dan doa sesuai arahan ibu panti."],
  ["13.03", "Kakak Bilang versi angka; anak memimpin secara sukarela."],
  ["13.12", "Cerita misi dan bagikan Paspor Petualang."],
  ["13.15", "Tes level anak yang belum ikut; yang lain bermain Perang Kartu."],
  ["13.30", "Meja Belajar: satu target kecil per anak, pakai benda nyata."],
  ["13.55", "Jeda gerak dan minum."],
  ["14.00", "Kuis Misi lima soal; yang menunggu bermain angka."],
  ["14.12", "Nama pulau, stempel untuk usaha, refleksi, dan doa penutup."],
  ["14.22", "Beres-beres dan berbincang singkat dengan ibu panti."],
]

export default async function DayOneGuidePage() {
  await requireUser()
  return <Shell title="Panduan pertemuan kedua" eyebrow="Untuk relawan">
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <section className="surface p-6">
        <h2 className="font-heading text-2xl">Rundown 13.00–14.30</h2>
        <ol className="mt-5 divide-y divide-[#eadfce]">{rundown.map(([time, task]) => <li key={time} className="grid grid-cols-[4rem_1fr] gap-3 py-3 text-sm"><strong>{time}</strong><span>{task}</span></li>)}</ol>
      </section>
      <div className="space-y-6">
        <section className="surface p-6">
          <h2 className="font-heading text-xl">Cara mendampingi</h2>
          <ol className="mt-4 list-inside list-decimal space-y-2 text-sm leading-6"><li>Mulai dengan satu atau dua soal yang anak sudah bisa.</li><li>Kenalkan satu hal baru dengan benda, lalu gambar, kemudian simbol.</li><li>Coba bersama, lalu beri waktu anak mencoba sendiri.</li><li>Catat jawaban yang dipilih dan bantuan yang diberikan.</li><li>Tutup dengan keberhasilan kecil.</li></ol>
        </section>
        <section className="surface p-6">
          <h2 className="font-heading text-xl">Yang perlu diamati</h2>
          <p className="mt-3 text-sm leading-6">Bedakan belum paham dengan belum nyaman. Catat semangat 1–3 pada pembuka, meja, permainan, dan tablet; lama fokus; respons saat sulit; cara membantu teman; serta penggunaan audio atau bantuan di tablet. Satu kejadian adalah catatan, belum kesimpulan.</p>
        </section>
        <section className="surface p-6">
          <h2 className="font-heading text-xl">Aturan aman</h2>
          <p className="mt-3 text-sm leading-6">Jangan sebut level atau bandingkan anak di depan teman. Semua meja tetap terlihat. Stempel diberikan untuk berani mencoba, bukan jawaban benar. Jangan foto wajah atau bertanya soal keluarga.</p>
        </section>
      </div>
    </div>
    <div className="surface mt-6 p-6">
      <h2 className="font-heading text-xl">Sebelum pulang</h2>
      <p className="mt-2 text-sm leading-6">Tanyakan izin dan waktu untuk Misi Rumah yang opsional, serta ketersediaan perangkat dan pendamping. Isi catatan sesi segera setelah kegiatan. Keputusan tentang latihan digital dibuat setelah beberapa pertemuan, bukan dari satu tes.</p>
      <Button render={<Link href="/participants" />} className="mt-5">Pilih peserta →</Button>
    </div>
  </Shell>
}
