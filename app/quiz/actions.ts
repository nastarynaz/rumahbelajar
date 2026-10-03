"use server"
import { createHmac } from "node:crypto"
import { headers } from "next/headers"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"

const schema = z.object({
  submissionKey: z.uuid(),
  fullName: z.string().trim().min(2).max(120),
  ageYears: z.number().int().min(4).max(99),
  answers: z.array(z.object({ question_id: z.string().max(30), value: z.string().max(80) })).max(50),
  website: z.string().max(200).default(""),
})

export async function submitQuiz(slug: string, payload: unknown) {
  const input = schema.safeParse(payload)
  if (!input.success || !/^[a-zA-Z0-9_-]{12,80}$/.test(slug)) throw new Error("Periksa kembali isian kuis.")
  if (input.data.website) throw new Error("Kiriman tidak dapat diproses.")
  const headerStore = await headers()
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || "unknown"
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) throw new Error("Kuis belum dikonfigurasi.")
  const clientHash = createHmac("sha256", secret).update(ip).digest("hex")
  const admin = createAdminClient()
  const { data: attemptId, error } = await admin.rpc("submit_public_quiz", {
    target_slug: slug, request_key: input.data.submissionKey, name_input: input.data.fullName,
    age_input: input.data.ageYears, answers_input: input.data.answers, client_hash: clientHash,
  })
  if (error) {
    console.error("quiz_submit_failed", error.code)
    throw new Error(error.message.includes("Terlalu banyak") ? "Terlalu banyak kiriman. Coba lagi nanti." : error.message.includes("wajib") ? "Masih ada soal wajib yang belum dijawab." : "Jawaban belum terkirim. Coba lagi.")
  }
  const { data: attempt } = await admin.from("public_quiz_attempts").select("result").eq("id", attemptId).maybeSingle()
  const result = attempt?.result as { correct?: number; total?: number } | undefined
  return { ok: true, score: result && typeof result.correct === "number" && typeof result.total === "number"
    ? { correct: result.correct, total: result.total } : null }
}
