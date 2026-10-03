"use client"
import { Button } from "@/components/ui/button"

export default function ErrorPage({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fff7ea] p-4">
      <div className="surface max-w-md p-8">
        <p className="text-xs font-bold tracking-[.16em] text-[#a9432b] uppercase">
          Rumah Belajar
        </p>
        <h1 className="mt-2 font-heading text-2xl">
          Halaman belum dapat dimuat
        </h1>
        <p className="mt-3 text-sm leading-6">
          Coba muat kembali. Jika masih terjadi, beri tahu pengelola halaman
          yang sedang dibuka.
        </p>
        <Button onClick={reset} className="mt-5">
          Coba lagi
        </Button>
      </div>
    </main>
  )
}
