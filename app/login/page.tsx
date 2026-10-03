import Image from "next/image"
import { sendMagicLink, signInWithPassword } from "./actions"

export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const query = await searchParams
  return <main className="min-h-screen bg-[#f8f3eb] px-4 py-12 text-[#22362f]"><div className="mx-auto max-w-md rounded-[28px] border border-[#e9d8bf] bg-white p-7 shadow-sm sm:p-10">
    <Image src="/logo-rumah-belajar-satu-baris.svg" width={230} height={68} alt="Rumah Belajar" className="h-auto w-52" />
    <p className="mt-12 text-xs font-bold uppercase tracking-[.18em] text-[#ad492f]">Ruang relawan</p><h1 className="mt-2 font-heading text-3xl">Masuk ke asesmen</h1>
    <p className="mt-3 text-sm leading-6 text-[#466055]">Masuk dengan akun yang sudah terdaftar. Relawan yang diundang juga bisa memakai tautan sekali pakai.</p>
    {query.sent && <p role="status" className="mt-6 rounded-xl bg-[#e8f3ee] p-4 text-sm">Tautan masuk sudah dikirim. Periksa kotak masuk email Anda.</p>}
    {query.error && <p role="alert" className="mt-6 rounded-xl bg-[#fff1ea] p-4 text-sm">{query.error === "tautan" ? "Tautan sudah tidak berlaku. Minta tautan baru." : query.error === "credentials" ? "Email atau password tidak cocok." : "Email tidak valid atau tautan gagal dikirim. Coba lagi."}</p>}
    <form action={signInWithPassword} className="mt-7 space-y-4"><div><label htmlFor="email" className="block text-sm font-semibold">Email</label><input id="email" name="email" type="email" required autoComplete="username" className="mt-2 h-12 w-full rounded-xl border border-[#b7c7bf] px-4 outline-none focus-visible:ring-2 focus-visible:ring-[#2e5a4c]" /></div><div><label htmlFor="password" className="block text-sm font-semibold">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className="mt-2 h-12 w-full rounded-xl border border-[#b7c7bf] px-4 outline-none focus-visible:ring-2 focus-visible:ring-[#2e5a4c]" /></div><button className="brand-primary min-h-12 w-full rounded-xl px-5 font-semibold">Masuk</button></form>
    <div className="my-7 flex items-center gap-3 text-xs text-[#63776c]"><span className="h-px flex-1 bg-[#e9d8bf]" />Atau gunakan tautan email<span className="h-px flex-1 bg-[#e9d8bf]" /></div>
    <form action={sendMagicLink} className="space-y-4"><div><label htmlFor="link-email" className="block text-sm font-semibold">Email untuk tautan masuk</label><input id="link-email" name="email" type="email" required autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-[#b7c7bf] px-4 outline-none focus-visible:ring-2 focus-visible:ring-[#2e5a4c]" /></div><button className="min-h-12 w-full rounded-xl border border-[#2e5a4c] px-5 font-semibold text-[#2e5a4c]">Kirim tautan masuk</button></form>
  </div></main>
}
