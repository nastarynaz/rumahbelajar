import Link from "next/link"
import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { Shell, Empty } from "@/components/product/shell"
import { Button } from "@/components/ui/button"

export default async function ParticipantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, membership } = await requireUser()
  const [person, history, quizzes] = await Promise.all([
    supabase.from("participants").select("id,display_name,code,start_level,programs(name)").eq("id", id).single(),
    supabase.from("assessment_sessions").select("id,type,status,assessed_on,highest_passed_level,summary_note").eq("participant_id", id).order("assessed_on", { ascending: false }),
    membership.role === "admin" ? supabase.from("public_quiz_attempts").select("id,created_at,result").eq("participant_id", id).order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ])
  if (!person.data) notFound()
  if (history.error || quizzes.error) throw new Error("Riwayat belum dapat dimuat.")
  return <Shell title={person.data.display_name} eyebrow="Perkembangan peserta" admin={membership.role === "admin"} action={<Button render={<Link href={`/assessments/new?participant=${id}`} />} variant="default">Sesi baru</Button>}>
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]"><section><h2 className="mb-3 font-heading text-2xl">Riwayat asesmen</h2>{history.data?.length ? <ol className="surface divide-y divide-[#eadfce]">{history.data.map((session) => <li key={session.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold capitalize">{session.type} · {session.assessed_on}</p><p className="mt-1 text-sm text-[#4d6156]">{session.status === "completed" ? session.highest_passed_level ? `Level tertinggi terbukti: ${session.highest_passed_level}` : "Belum ada bukti yang cukup pada sesi ini." : "Belum selesai"}</p></div><Button render={<Link href={`/assessments/${session.id}/${session.status === "completed" ? "result" : "run"}`} />} variant="outline">{session.status === "completed" ? "Lihat hasil" : "Lanjutkan"}</Button></div>{session.summary_note && <p className="mt-3 text-sm text-[#4d6156]">{session.summary_note}</p>}</li>)}</ol> : <Empty title="Belum ada riwayat" body="Asesmen pertama akan menjadi titik awal perkembangan peserta ini." />}</section><aside className="surface h-fit p-5"><h2 className="font-heading text-xl">Data seperlunya</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-[#4d6156]">Kode</dt><dd className="font-semibold">{person.data.code || "—"}</dd></div><div><dt className="text-[#4d6156]">Level mulai default</dt><dd className="font-semibold">{person.data.start_level}</dd></div></dl></aside></div>
    {membership.role === "admin" && quizzes.data && quizzes.data.length > 0 && <section className="mt-7"><h2 className="mb-3 font-heading text-2xl">Posttest mandiri</h2><div className="surface divide-y divide-[#eadfce]">{quizzes.data.map((quiz) => { const result = quiz.result as {correct:number;total:number}; return <Link key={quiz.id} href={`/settings/quiz/${quiz.id}`} className="flex min-h-16 items-center justify-between gap-3 p-4"><span>{new Date(quiz.created_at).toLocaleDateString("id-ID")} · {result.correct}/{result.total} jawaban tepat</span><span className="font-semibold text-[#2e5a4c]">Lihat →</span></Link> })}</div><p className="mt-2 text-xs text-[#4d6156]">Skor kuis mandiri tidak dikonversi ke level asesmen relawan.</p></section>}
  </Shell>
}
