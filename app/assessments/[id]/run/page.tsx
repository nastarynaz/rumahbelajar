import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/data"
import { requireUser } from "@/lib/auth"
import { AssessmentRunner } from "@/components/product/assessment-runner"
import type { Answer, Level } from "@/lib/instrument"

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  const session = await getSession(id)
  if (!session) notFound()
  if (session.status === "completed") redirect(`/assessments/${id}/result`)
  if (session.status === "void") notFound()
  const snapshot = session.instrument_snapshot as { version: string; levels: Level[] }
  const answers: Answer[] = session.assessment_responses.map((row: { question_code: string; status: Answer["status"]; response: string | null; help: string | null; note: string | null }) => ({ question_id: row.question_code, status: row.status, response: row.response ?? undefined, help: row.help ?? undefined, note: row.note ?? undefined }))
  return <AssessmentRunner id={id} participantName={session.participants.display_name} startLevel={session.start_level} revision={session.revision} snapshot={snapshot} initialAnswers={answers} />
}
