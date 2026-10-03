import Image from "next/image"
import { sendMagicLink } from "./actions"

export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const query = await searchParams
  return <main className="min-h-screen bg-[#f8f3eb] px-4 py-12 text-[#22362f]"><div className="mx-auto max-w-md rounded-[28px] border border-[#e9d8bf] bg-white p-7 shadow-sm sm:p-10">
    <Image src="/logo-rumah-belajar-satu-baris.svg" width={230} height={68} alt="Rumah Belajar" className="h-auto w-52" />
    <p className="mt-12 text-xs font-bold uppercase tracking-[.18em] text-[#ad492f]">Ruang relawan</p><h1 className="mt-2 font-heading text-3xl">Masuk ke asesmen</h1>
    <p className="mt-3 text-sm leading-6 text-[#466055]">Gunakan email yang sudah diundang admin. Kami akan mengirim tautan masuk sekali pakai.</p>
    {query.sent && <p role="status" className="mt-6 rounded-xl bg-[#e8f3ee] p-4 text-sm">Tautan masuk sudah dikirim. Periksa kotak masuk email Anda.</p>}
    {query.error && <p role="alert" className="mt-6 rounded-xl bg-[#fff1ea] p-4 text-sm">{query.error === "tautan" ? "Tautan sudah tidak berlaku. Minta tautan baru." : "Email tidak valid atau tautan gagal dikirim. Coba lagi."}</p>}
    <form action={sendMagicLink} className="mt-7 space-y-4"><div><label htmlFor="email" className="block text-sm font-semibold">Email relawan</label><input id="email" name="email" type="email" required autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-[#b7c7bf] px-4 outline-none focus-visible:ring-2 focus-visible:ring-[#2e5a4c]" /></div><button className="brand-primary min-h-12 w-full rounded-xl px-5 font-semibold">Kirim tautan masuk</button></form>
  </div></main>
}
