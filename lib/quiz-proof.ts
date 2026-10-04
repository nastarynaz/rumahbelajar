import { createHmac, timingSafeEqual } from "node:crypto"

export function quizAnswerProof(slug: string, questionId: string, answer: string) {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) throw new Error("Kuis belum dikonfigurasi.")
  return createHmac("sha256", secret)
    .update(JSON.stringify(["quiz-answer-v1", slug, questionId, answer]))
    .digest("hex")
}

export function matchesQuizAnswerProof(slug: string, questionId: string, answer: string, proof: string) {
  if (!/^[a-f0-9]{64}$/.test(proof)) return false
  const expected = Buffer.from(quizAnswerProof(slug, questionId, answer), "hex")
  return timingSafeEqual(expected, Buffer.from(proof, "hex"))
}
