import { requireUser } from "@/lib/auth"
import { Shell, Empty } from "@/components/product/shell"
import { levels } from "@/lib/instrument"

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; type?: string }> }) {
  const filters = await searchParams
  const { supabase, membership } = await requireUser()
  let query = supabase.from("assessment_sessions").select("participant_id,type,assessed_on,highest_passed_level").eq("organization_id", membership.organization_id).eq("status", "completed").order("assessed_on", { ascending: false }).limit(1000)
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) query = query.gte("assessed_on", filters.from)
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) query = query.lte("assessed_on", filters.to)
  const { data, error } = await query
  if (error) throw new Error("Laporan belum dapat dimuat.")
  const selected = ["baseline","posttest","reassessment"].includes(filters.type ?? "") ? data?.filter((row) => row.type === filters.type) ?? [] : data ?? []
  const uniqueParticipants = new Set(selected.map((row) => row.participant_id))
  const thresholdMet = uniqueParticipants.size >= 5
  const distribution = levels.map((level) => ({ code: level.code, title: level.title, count: selected.filter((row) => row.highest_passed_level === level.code).length }))
  const byParticipant = new Map<string, typeof data>()
  for (const row of data ?? []) byParticipant.set(row.participant_id, [...(byParticipant.get(row.participant_id) ?? []), row])
  const changes = [...byParticipant.values()].flatMap((history) => {
    const baseline = history?.filter((row) => row.type === "baseline" && row.highest_passed_level).at(-1)
    const posttest = history?.find((row) => row.type === "posttest" && row.highest_passed_level)
    if (!baseline || !posttest) return []
    const start = levels.findIndex((level) => level.code === baseline.highest_passed_level)
    const end = levels.findIndex((level) => level.code === posttest.highest_passed_level)
    return [end - start]
  })
  const comparisonVisible = changes.length >= 5
  return <Shell title="Laporan program" eyebrow="Agregat tanpa identitas" admin={membership.role === "admin"}><form className="surface mb-6 grid gap-3 p-4 sm:grid-cols-4"><label className="text-sm font-semibold">Dari<input type="date" name="from" className="field mt-2" defaultValue={filters.from} /></label><label className="text-sm font-semibold">Sampai<input type="date" name="to" className="field mt-2" defaultValue={filters.to} /></label><label className="text-sm font-semibold">Jenis sesi<select name="type" className="field mt-2" defaultValue={filters.type ?? ""}><option value="">Semua</option><option value="baseline">Baseline</option><option value="posttest">Posttest</option><option value="reassessment">Asesmen ulang</option></select></label><button className="action self-end">Terapkan filter</button></form>
  {!thresholdMet ? <Empty title="Data agregat belum ditampilkan" body="Laporan memerlukan sedikitnya 5 peserta berbeda pada filter ini agar identitas peserta tidak mudah ditebak." /> : <><div className="surface p-5"><p className="text-sm text-[#4d6156]">{uniqueParticipants.size} peserta · {selected.length} sesi selesai</p><h2 className="mt-2 font-heading text-2xl">Distribusi level tertinggi</h2><div className="mt-5 space-y-4">{distribution.map((item) => <div key={item.code}><div className="flex justify-between text-sm"><span>{item.code} · {item.title}</span><strong>{item.count}</strong></div><div className="mt-2 h-2 rounded-full bg-[#eee3d3]"><div className="h-full rounded-full bg-[#2e5a4c]" style={{ width: `${Math.round(item.count / Math.max(selected.length, 1) * 100)}%` }} /></div></div>)}</div></div><p className="mt-4 text-xs text-[#4d6156]">Hitungan berdasarkan sesi pada periode yang dipilih. Satu peserta dapat memiliki lebih dari satu sesi.</p><section className="surface mt-6 p-5"><h2 className="font-heading text-2xl">Baseline ke posttest</h2>{comparisonVisible ? <div className="mt-4 grid gap-3 sm:grid-cols-3"><div><strong className="font-heading text-3xl">{changes.filter((value) => value > 0).length}</strong><p className="text-sm">Naik level</p></div><div><strong className="font-heading text-3xl">{changes.filter((value) => value === 0).length}</strong><p className="text-sm">Tetap</p></div><div><strong className="font-heading text-3xl">{changes.filter((value) => value < 0).length}</strong><p className="text-sm">Perlu ditinjau</p></div></div> : <p className="mt-3 text-sm">Perbandingan ditampilkan setelah minimal 5 peserta memiliki baseline dan posttest yang dapat dibandingkan.</p>}</section></>}
  </Shell>
}
