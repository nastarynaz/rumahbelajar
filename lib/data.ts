import { createClient } from "@/lib/supabase/server"
import { levels, type Level, type Question } from "@/lib/instrument"

export async function getInstrument() {
  const supabase = await createClient()
  const { data: instrument, error } = await supabase.from("instruments").select("id,version,instrument_levels(id,code,title,threshold,sort_order,questions(code,prompt,answer,role,kind,visual,help,sort_order))").eq("version", "tangga-angka-v1").eq("published", true).single()
  if (error || !instrument) throw new Error("Instrumen Tangga Angka belum tersedia. Jalankan migrasi Supabase.")
  const sorted: Level[] = [...instrument.instrument_levels].sort((a, b) => a.sort_order - b.sort_order).map((level) => ({
    code: level.code as Level["code"], title: level.title, threshold: level.threshold,
    questions: [...level.questions].sort((a, b) => a.sort_order - b.sort_order).map((question): Question => ({
      id: question.code, level: level.code as Level["code"], prompt: question.prompt, answer: question.answer,
      role: question.role as Question["role"], kind: question.kind as Question["kind"],
      visual: question.visual as Question["visual"], help: question.help ?? undefined,
    })),
  }))
  if (sorted.length !== levels.length) throw new Error("Instrumen belum lengkap.")
  return { id: instrument.id, snapshot: { version: instrument.version, levels: sorted } }
}

export async function getSession(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from("assessment_sessions").select("*,participants(display_name,code),assessment_responses(question_code,status,response,help,note),assessment_observations(counting_method,explanation,difficulty_response,tools,motivator,note)").eq("id", id).single()
  if (error || !data) return null
  return data
}
