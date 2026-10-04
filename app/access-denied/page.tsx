import Link from "next/link"
import { signOut } from "@/app/login/actions"
import { Button } from "@/components/ui/button"
export default function AccessDenied() { return <main className="grid min-h-screen place-items-center bg-[#f8f3eb] p-6"><div className="max-w-md rounded-3xl bg-white p-8"><h1 className="font-heading text-3xl">Akses belum tersedia</h1><p className="mt-3 leading-6">Akun ini belum terhubung ke tim Rumah Belajar. Hubungi admin untuk mendapatkan penugasan.</p><div className="mt-6 flex gap-4"><Link href="/dashboard" className="underline">Coba lagi</Link><form action={signOut}><Button type="submit" variant="link">Keluar</Button></form></div></div></main> }
