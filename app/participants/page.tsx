import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { Shell, Empty } from "@/components/product/shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default async function ParticipantsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const { supabase, membership } = await requireUser()
  let query = supabase.from("participants").select("id,display_name,code,start_level,programs(name)").eq("organization_id", membership.organization_id).is("archived_at", null).order("display_name").limit(100)
  if (q?.trim()) query = query.ilike("display_name", `%${q.trim().replaceAll("%", "")}%`)
  const { data, error } = await query
  if (error) throw new Error("Daftar peserta belum dapat dimuat.")
  return <Shell title="Peserta" eyebrow="Orang, bukan peringkat" admin={membership.role === "admin"} action={<div className="flex flex-wrap gap-2">{membership.role === "admin" && <Button render={<Link href="/settings/participants" />} variant="outline">Tambah peserta</Button>}<Button render={<Link href="/assessments/new" />} variant="default">Buat sesi</Button></div>}>
    <form className="mb-5 flex max-w-lg gap-2"><label htmlFor="q" className="sr-only">Cari peserta</label><Input id="q" name="q" placeholder="Cari nama tampilan peserta" defaultValue={q ?? ""} /><Button type="submit">Cari</Button></form>
    {data?.length ? <div className="grid gap-3 sm:grid-cols-2">{data.map((participant) => <Link key={participant.id} href={`/participants/${participant.id}`} className="surface flex min-h-28 items-center justify-between gap-4 p-5 hover:border-[#2e5a4c]"><div><h2 className="font-heading text-xl">{participant.display_name}</h2><p className="mt-1 text-sm text-[#4d6156]">{participant.code || "Tanpa kode"} · Awal sesi {participant.start_level}</p></div><span aria-hidden className="text-xl text-[#2e5a4c]">→</span></Link>)}</div> : <Empty title={q ? "Tidak ada hasil" : "Belum ada peserta"} body={q ? "Coba kata pencarian lain." : "Admin perlu menambahkan peserta dan mengatur penugasan relawan."} />}
  </Shell>
}
