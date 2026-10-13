"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireUser } from "@/lib/auth"
import { missionForLevel } from "@/lib/mission"
import type { LevelCode } from "@/lib/instrument"

const levelSchema = z.enum(["A","B","C","D1","D2","E","F","G","H","I"])
const inputSchema = z.object({
  participantId: z.uuid(),
  submissionKey: z.uuid(),
  level: levelSchema,
  answers: z.array(z.object({
    id: z.string().max(30),
    selected: z.string().max(80),
    assisted: z.boolean(),
    audioUses: z.number().int().min(0).max(20),
  })).length(5),
})

export async function submitMission(payload: unknown) {
  const input = inputSchema.parse(payload)
  const { supabase, membership, user } = await requireUser()
  const { data: person, error: personError } = await supabase.from("participants")
    .select("id,organization_id").eq("id", input.participantId)
    .eq("organization_id", membership.organization_id).is("archived_at", null).single()
  if (personError || !person) throw new Error("Peserta tidak tersedia.")

  const questions = missionForLevel(input.level as LevelCode)
  const answers = questions.map((question, index) => {
    const submitted = input.answers[index]
    if (submitted.id !== question.id || !question.options.includes(submitted.selected)) {
      throw new Error("Jawaban kuis tidak valid.")
    }
    return {
      question_id: question.id,
      phase: question.phase,
      selected: submitted.selected,
      correct: submitted.selected === question.answer,
      assisted: submitted.assisted,
      audio_uses: submitted.audioUses,
    }
  })
  const { data: existing } = await supabase.from("mission_attempts")
    .select("participant_id,level,created_by").eq("organization_id", membership.organization_id)
    .eq("submission_key", input.submissionKey).maybeSingle()
  if (existing) {
    if (existing.participant_id !== input.participantId || existing.level !== input.level || existing.created_by !== user.id) throw new Error("Kiriman kuis tidak sesuai.")
    return { ok: true }
  }
  const { error } = await supabase.from("mission_attempts").insert({
    organization_id: membership.organization_id,
    participant_id: input.participantId,
    created_by: user.id,
    submission_key: input.submissionKey,
    level: input.level,
    answers,
    independent_correct: answers.filter((answer) => answer.correct && !answer.assisted).length,
    assisted_count: answers.filter((answer) => answer.assisted).length,
  })
  if (error) {
    if (error.code === "23505") {
      const { data: duplicate } = await supabase.from("mission_attempts")
        .select("participant_id,level,created_by").eq("organization_id", membership.organization_id)
        .eq("submission_key", input.submissionKey).maybeSingle()
      if (duplicate?.participant_id === input.participantId && duplicate.level === input.level && duplicate.created_by === user.id) return { ok: true }
    }
    throw new Error("Kuis belum tersimpan. Coba lagi.")
  }
  revalidatePath(`/participants/${input.participantId}`)
  return { ok: true }
}
