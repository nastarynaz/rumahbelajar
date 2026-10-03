import Image from "next/image"
import Link from "next/link"
import { signOut } from "@/app/login/actions"
import { Button } from "@/components/ui/button"

export function Shell({
  children,
  title,
  eyebrow,
  action,
  admin = false,
  superAdmin = false,
}: {
  children: React.ReactNode
  title: string
  eyebrow?: string
  action?: React.ReactNode
  admin?: boolean
  superAdmin?: boolean
}) {
  return (
    <div className="min-h-screen bg-[#f8f4ed] pb-20 text-[#22362f] md:pb-8">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dfd5c7] pb-5">
          <Link href="/dashboard" aria-label="Rumah Belajar, dashboard">
            <Image
              src="/logo-rumah-belajar-satu-baris.svg"
              width={200}
              height={60}
              alt="Rumah Belajar"
              className="h-12 w-auto"
            />
          </Link>
          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-1 md:flex"
          >
            <Button
              render={<Link href="/dashboard" />}
              variant="ghost"
              size="sm"
            >
              Beranda
            </Button>
            <Button
              render={<Link href="/participants" />}
              variant="ghost"
              size="sm"
            >
              Peserta
            </Button>
            <Button render={<Link href="/reports" />} variant="ghost" size="sm">
              Laporan
            </Button>
            {admin && (
              <>
                <Button
                  render={<Link href="/settings/quiz" />}
                  variant="ghost"
                  size="sm"
                >
                  Kuis
                </Button>
                <Button
                  render={<Link href="/settings/team" />}
                  variant="ghost"
                  size="sm"
                >
                  Tim
                </Button>
              </>
            )}
            {superAdmin && (
              <Button
                render={<Link href="/super-admin" />}
                variant="ghost"
                size="sm"
              >
                Platform
              </Button>
            )}
            <form action={signOut}>
              <Button variant="ghost" size="sm">
                Keluar
              </Button>
            </form>
          </nav>
        </header>
        <div className="mt-8 mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <p className="text-xs font-bold tracking-[.18em] text-[#a9432b] uppercase">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 font-heading text-3xl leading-tight sm:text-4xl">
              {title}
            </h1>
          </div>
          {action}
        </div>
        {children}
      </div>
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-20 flex justify-around overflow-x-auto border-t border-[#dfd5c7] bg-white px-2 py-2 shadow-lg md:hidden"
      >
        <Button
          render={<Link href="/dashboard" />}
          variant="ghost"
          size="sm"
          className="min-w-[65px] px-2 text-xs"
        >
          Beranda
        </Button>
        <Button
          render={<Link href="/participants" />}
          variant="ghost"
          size="sm"
          className="min-w-[65px] px-2 text-xs"
        >
          Peserta
        </Button>
        <Button
          render={<Link href="/assessments/new" />}
          variant="ghost"
          size="sm"
          className="min-w-[65px] px-2 text-xs"
        >
          Asesmen
        </Button>
        <Button
          render={<Link href="/reports" />}
          variant="ghost"
          size="sm"
          className="min-w-[65px] px-2 text-xs"
        >
          Laporan
        </Button>
        {admin && (
          <Button
            render={<Link href="/settings/quiz" />}
            variant="ghost"
            size="sm"
            className="min-w-[65px] px-2 text-xs"
          >
            Kuis
          </Button>
        )}
        {superAdmin && (
          <Button
            render={<Link href="/super-admin" />}
            variant="ghost"
            size="sm"
            className="min-w-[65px] px-2 text-xs"
          >
            Platform
          </Button>
        )}
      </nav>
    </div>
  )
}
export function Empty({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#cbbca5] bg-white p-8 text-center">
      <h2 className="font-heading text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#4d6156]">
        {body}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
