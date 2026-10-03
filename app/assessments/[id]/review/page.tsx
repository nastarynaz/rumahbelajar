import { notFound, redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { getSession } from "@/lib/data"
import { evaluateLevel, highestPassed, groupForLevel, type Answer, type Level } from "@/lib/instrument"
import { Shell } from "@/components/product/shell"
import { ReviewForm } from "@/components/product/review-form"

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  const session = await getSession(id)
  if (!session) notFound()
  if (session.status === "completed") redirect(`/assessments/${id}/result`)
  const snapshot = session.instrument_snapshot as { version: string; levels: Level[] }
  const answers: Answer[] = session.assessment_responses.map((row: { question_code: string; status: Answer["status"]; response: string | null; help: string | null; note: string | null }) => ({ question_id: row.question_code, status: row.status, response: row.response ?? undefined, help: row.help ?? undefined, note: row.note ?? undefined }))
  const highest = highestPassed(snapshot, answers)
  return <Shell title="Tinjau sebelum selesai" eyebrow={session.participants.display_name}>
    <div className="grid gap-6 lg:grid-cols-[1fr_21rem]"><section className="space-y-5"><div className="surface p-5"><h2 className="font-heading text-xl">Bukti per level</h2><p className="mt-1 text-sm text-[#4d6156]">Level tertinggi yang memenuhi kriteria: <strong>{highest ?? "Belum ada bukti yang cukup pada sesi ini."}</strong>{highest && <> · Kelompok rekomendasi internal: {groupForLevel(highest)}</>}</p></div>{snapshot.levels.filter((level) => level.questions.some((question) => answers.some((answer) => answer.question_id === question.id))).map((level) => { const result = evaluateLevel(level, answers); return <section key={level.code} className="surface p-5"><h3 className="font-heading text-xl">{level.code} · {level.title}</h3><p className="mt-1 text-sm text-[#4d6156]">{result.score}/{result.total} benar pada soal inti · ambang {result.threshold} · {result.passed ? "Kriteria terpenuhi" : "Belum terpenuhi"}</p><ul className="mt-4 divide-y divide-[#eadfce]">{level.questions.filter((question) => answers.some((answer) => answer.question_id === question.id)).map((question) => { const answer = answers.find((item) => item.question_id === question.id)!; return <li key={question.id} className="flex justify-between gap-3 py-3 text-sm"><span>{question.prompt}<small className="block text-[#4d6156]">{question.role === "core" ? "Soal inti" : "Tidak dihitung ke ambang"}</small></span><span className="shrink-0 font-semibold">{answer.status === "correct" ? "Benar" : answer.status === "incorrect" ? "Belum tepat" : "Dilewati"}</span></li> })}</ul></section> })}</section><ReviewForm id={id} revision={session.revision} observation={session.assessment_observations?.[0] ?? null} /></div>
  </Shell>
}
