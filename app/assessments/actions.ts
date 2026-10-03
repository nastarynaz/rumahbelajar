"use server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireUser } from "@/lib/auth"
import { getSession } from "@/lib/data"

const level = z.enum(["A","B","C","D1","D2","E","F"])
const sessionType = z.enum(["baseline","posttest","reassessment"])
const status = z.enum(["correct","incorrect","skipped","not_asked"])

export async function createAssessment(formData: FormData) {
  const input = z.object({ participant_id: z.uuid(), type: sessionType, assessed_on: z.iso.date(), start_level: level, idempotency_key: z.uuid() }).safeParse(Object.fromEntries(formData))
  if (!input.success) throw new Error("Data sesi tidak valid.")
  const { supabase } = await requireUser()
  const { data: id, error } = await supabase.rpc("create_assessment", {
    target_participant: input.data.participant_id, session_type: input.data.type, assessment_date: input.data.assessed_on,
    initial_level: input.data.start_level, request_key: input.data.idempotency_key,
  })
  if (error || !id) throw new Error(error?.message ?? "Sesi gagal dibuat.")
  redirect(`/assessments/${id}/run`)
}

export async function saveResponse(sessionId: string, payload: unknown, expectedRevision: number) {
  const input = z.object({ question_id: z.string().max(30), status, response: z.string().max(300).optional(), help: z.string().max(120).optional(), note: z.string().max(1000).optional() }).parse(payload)
  const { supabase } = await requireUser()
  const { data, error } = await supabase.rpc("save_assessment_response", {
    target_session: sessionId, expected_revision: expectedRevision, answer_question_code: input.question_id,
    answer_status: input.status, answer_response: input.response ?? null, answer_help: input.help ?? null, answer_note: input.note ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/assessments/${sessionId}/run`)
  return { revision: data as number }

}

export async function saveObservation(sessionId: string, payload: unknown) {
  const input = z.object({ counting_method: z.string().max(80).nullable(), explanation: z.string().max(80).nullable(), difficulty_response: z.string().max(80).nullable(), tools: z.array(z.string().max(80)).max(8), motivator: z.string().max(300), note: z.string().max(1000) }).parse(payload)
  const { supabase } = await requireUser()
  const session = await getSession(sessionId)
  if (!session || session.status === "completed" || session.status === "void") throw new Error("Sesi tidak bisa diubah.")
  const { error } = await supabase.from("assessment_observations").upsert({ organization_id: session.organization_id, session_id: sessionId, ...input }, { onConflict: "session_id" })
  if (error) throw new Error("Catatan belum tersimpan.")
  revalidatePath(`/assessments/${sessionId}/review`)
}

export async function finalizeAssessment(sessionId: string, formData: FormData) {
  const input = z.object({ revision: z.coerce.number().int(), stop_reason: z.enum(["level_not_met","child_declined","assessor_decision","all_levels_passed","time_limit"]), override_reason: z.string().max(1000).optional(), summary_note: z.string().max(2000).optional() }).safeParse(Object.fromEntries(formData))
  if (!input.success) throw new Error("Data finalisasi tidak valid.")
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc("finalize_assessment", { target_session: sessionId, expected_revision: input.data.revision, final_stop_reason: input.data.stop_reason, final_override_reason: input.data.override_reason || null, final_summary_note: input.data.summary_note || null })
  if (error) throw new Error(error.message)
  revalidatePath(`/assessments/${sessionId}/result`)
  redirect(`/assessments/${sessionId}/result`)
}
