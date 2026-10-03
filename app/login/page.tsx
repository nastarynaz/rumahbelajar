import Image from "next/image"
import { sendMagicLink, signInWithPassword } from "./actions"

const inputClass = "login-input mt-1.5 h-12 w-full rounded-xl border border-[#b9c9bd] bg-white px-3.5 text-[#20392f] outline-none transition-colors focus-visible:border-[#285b47] focus-visible:ring-2 focus-visible:ring-[#285b47]/15"

export default async function Login({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const query = await searchParams
  const linkState = Boolean(query.sent || query.error === "email" || query.error === "kirim")
  const errorMessage = query.error === "tautan"
    ? "Tautan sudah tidak berlaku. Minta tautan baru."
    : query.error === "credentials"
      ? "Email atau password tidak cocok."
      : query.error
        ? "Tautan belum dapat dikirim. Periksa email dan coba lagi."
        : null

  return <main className="flex min-h-screen items-center justify-center bg-[#fff7ea] px-4 py-8 text-[#20392f] sm:py-12">
    <div className="w-full max-w-[440px] rounded-[22px] border border-[#ead7b9] bg-white px-6 py-7 shadow-[0_18px_60px_rgba(79,56,27,0.07)] sm:px-9 sm:py-9">
      <Image src="/logo-rumah-belajar-satu-baris.svg" width={230} height={68} alt="Rumah Belajar" className="h-auto w-44" priority />

      <div className="mt-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a85136]">Ruang relawan</p>
        <h1 className="mt-2 font-heading text-[32px] leading-[1.12] tracking-[-0.025em]">Masuk ke asesmen</h1>
        <p className="mt-3 text-sm leading-6 text-[#5b6e63]">Gunakan akun yang sudah terdaftar untuk mengelola asesmen dan posttest.</p>
      </div>

      {query.sent && <p role="status" className="mt-5 rounded-xl border border-[#cfe2d5] bg-[#f1f8f3] px-4 py-3 text-sm leading-5 text-[#285b47]">Tautan masuk sudah dikirim. Periksa kotak masuk email Anda.</p>}
      {errorMessage && <p role="alert" className="mt-5 rounded-xl border border-[#ead8ce] bg-[#fdf5f1] px-4 py-3 text-sm leading-5 text-[#823f31]">{errorMessage}</p>}

      <form action={signInWithPassword} className="mt-7 space-y-4">
        <div><label htmlFor="email" className="block text-sm font-semibold">Email</label><input id="email" name="email" type="email" required autoComplete="username" className={inputClass} /></div>
        <div><label htmlFor="password" className="block text-sm font-semibold">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className={inputClass} /></div>
        <button className="mt-1 min-h-12 w-full rounded-xl bg-[#285b47] px-5 font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-[#204b3a] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285b47]">Masuk</button>
      </form>

      <details open={linkState} className="group mt-6 border-t border-[#e6ece5] pt-5">
        <summary className="cursor-pointer list-none text-center text-sm font-semibold text-[#285b47] outline-none hover:text-[#204b3a] focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285b47] [&::-webkit-details-marker]:hidden">Masuk lewat tautan email <span aria-hidden="true" className="ml-1 inline-block transition-transform duration-150 group-open:rotate-180">⌄</span></summary>
        <div className="pt-5">
          <p className="mb-4 text-sm leading-5 text-[#5b6e63]">Kami akan mengirim tautan sekali pakai ke email yang sudah terdaftar.</p>
          <form action={sendMagicLink} className="space-y-4">
            <div><label htmlFor="link-email" className="block text-sm font-semibold">Email untuk tautan</label><input id="link-email" name="email" type="email" required autoComplete="email" className={inputClass} /></div>
            <button className="min-h-12 w-full rounded-xl border border-[#b8cec0] bg-white px-5 font-semibold text-[#285b47] transition-colors duration-150 hover:bg-[#f2f7f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285b47]">Kirim tautan masuk</button>
          </form>
        </div>
      </details>
    </div>
  </main>
}
