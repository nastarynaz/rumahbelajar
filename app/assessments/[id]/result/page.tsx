import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { getSession } from "@/lib/data"
import {
  evaluateLevel,
  groupForLevel,
  type Answer,
  type Level,
} from "@/lib/instrument"
import { Shell } from "@/components/product/shell"
import { Button } from "@/components/ui/button"

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireUser()
  const { id } = await params
  const session = await getSession(id)
  if (!session) notFound()
  if (session.status !== "completed") redirect(`/assessments/${id}/review`)
  const snapshot = session.instrument_snapshot as {
    version: string
    levels: Level[]
  }
  const answers: Answer[] = session.assessment_responses.map(
    (row: {
      question_code: string
      status: Answer["status"]
      response: string | null
      help: string | null
      note: string | null
    }) => ({
      question_id: row.question_code,
      status: row.status,
      response: row.response ?? undefined,
      help: row.help ?? undefined,
      note: row.note ?? undefined,
    })
  )
  const events = session.assessment_answer_events as {
    question_code: string; status: Answer["status"]; response: string | null; help: string | null; created_at: string
  }[]
  const observation = session.assessment_observations?.[0]
  const metrics = observation?.day1_metrics as {
    engagement?: { opener?: number | null; desk?: number | null; game?: number | null; tablet?: number | null }
    focus_minutes?: number | null; comfort?: string; peer_help?: string; tablet_use?: string
  } | undefined
  return (
    <Shell
      title="Hasil sesi"
      eyebrow={`${session.participants.display_name} · ${session.assessed_on}`}
      action={
        <Button
          render={<Link href={`/participants/${session.participant_id}`} />}
          variant="default"
        >
          Lihat riwayat
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface p-5">
          <p className="text-sm text-[#4d6156]">Jenis sesi</p>
          <p className="mt-2 font-heading text-2xl capitalize">
            {session.type}
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-[#4d6156]">Level tertinggi terbukti</p>
          <p className="mt-2 font-heading text-3xl">
            {session.highest_passed_level ?? "—"}
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-[#4d6156]">Kelompok rekomendasi</p>
          <p className="mt-2 font-heading text-2xl capitalize">
            {groupForLevel(session.highest_passed_level) ?? "Belum ada"}
          </p>
        </div>
      </div>
      {!session.highest_passed_level && (
        <p className="mt-5 rounded-2xl bg-[#fff5e8] p-4">
          Belum ada bukti yang cukup pada sesi ini.
        </p>
      )}
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <section>
          <h2 className="mb-3 font-heading text-2xl">Bukti per level</h2>
          <div className="space-y-3">
            {snapshot.levels
              .filter((level) =>
                level.questions.some((question) =>
                  answers.some((answer) => answer.question_id === question.id)
                )
              )
              .map((level) => {
                const score = evaluateLevel(level, answers)
                return (
                  <div className="surface p-5" key={level.code}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-heading text-xl">
                        {level.code} · {level.title}
                      </h3>
                      <strong className="text-sm">
                        {score.score}/{score.total}
                      </strong>
                    </div>
                    <p className="mt-2 text-sm text-[#4d6156]">
                      Ambang {score.threshold} ·{" "}
                      {score.passed ? "Terpenuhi" : "Belum terpenuhi"}
                    </p>
                    <ul className="mt-3 divide-y divide-[#eadfce] text-sm">
                      {level.questions.filter((question) => answers.some((answer) => answer.question_id === question.id)).map((question) => {
                        const answer = answers.find((item) => item.question_id === question.id)!
                        const attempts = events.filter((event) => event.question_code === question.id).sort((a, b) => a.created_at.localeCompare(b.created_at))
                        return <li key={question.id} className="py-2">
                          <p className="font-semibold">{question.prompt}</p>
                          <p className="text-[#4d6156]">{answer.status === "correct" ? "Benar sendiri" : answer.status === "assisted" ? "Dibantu Kakak" : answer.status === "incorrect" ? "Belum tepat" : "Dilewati"}{answer.help ? ` · Bantuan: ${answer.help}` : ""}</p>
                          {attempts.length > 0 && <p className="text-[#4d6156]">Urutan jawaban: {attempts.map((attempt) => `${attempt.response || "tanpa jawaban tertulis"} (${attempt.status === "assisted" ? "dibantu" : attempt.status === "incorrect" ? "belum tepat" : attempt.status === "correct" ? "benar" : "dilewati"})`).join(" → ")}</p>}
                        </li>
                      })}
                    </ul>
                  </div>
                )
              })}
          </div>
        </section>
        <aside className="surface h-fit p-5">
          <h2 className="font-heading text-xl">Pertemuan berikutnya</h2>
          <p className="mt-3 text-sm leading-6">
            {session.summary_note || "Belum ada catatan tindak lanjut."}
          </p>
          <p className="mt-5 text-xs text-[#4d6156]">
            Instrumen {snapshot.version}. Hasil ini hanya dibandingkan dengan
            riwayat peserta yang sama.
          </p>
        </aside>
      </div>
      {metrics && Object.keys(metrics).length > 0 && <section className="surface mt-6 p-5">
        <h2 className="font-heading text-xl">Pengamatan sesi</h2>
        <p className="mt-2 text-sm text-[#4d6156]">Semangat (1–3): Kakak Bilang {metrics.engagement?.opener ?? "—"} · Meja Belajar {metrics.engagement?.desk ?? "—"} · Permainan {metrics.engagement?.game ?? "—"} · Tablet {metrics.engagement?.tablet ?? "—"}</p>
        <p className="mt-1 text-sm text-[#4d6156]">Lama fokus: {metrics.focus_minutes ?? "—"} menit · {metrics.comfort || "Kenyamanan belum dicatat"}</p>
        {metrics.peer_help && <p className="mt-1 text-sm text-[#4d6156]">Membantu teman: {metrics.peer_help}</p>}
        {metrics.tablet_use && <p className="mt-1 text-sm text-[#4d6156]">Tablet: {metrics.tablet_use}</p>}
      </section>}
    </Shell>
  )
}
