import { afterEach, describe, expect, it } from "vitest"
import { matchesQuizAnswerProof, quizAnswerProof } from "./quiz-proof"

const originalKey = process.env.SUPABASE_SECRET_KEY
afterEach(() => { process.env.SUPABASE_SECRET_KEY = originalKey })

describe("quiz answer proof", () => {
  it("accepts only the answer for its own quiz and question", () => {
    process.env.SUPABASE_SECRET_KEY = "test-key-only"
    const proof = quizAnswerProof("quiz-one", "q1", "7")
    expect(proof).toMatch(/^[a-f0-9]{64}$/)
    expect(matchesQuizAnswerProof("quiz-one", "q1", "7", proof)).toBe(true)
    expect(matchesQuizAnswerProof("quiz-one", "q1", "8", proof)).toBe(false)
    expect(matchesQuizAnswerProof("quiz-two", "q1", "7", proof)).toBe(false)
    expect(matchesQuizAnswerProof("quiz-one", "q2", "7", proof)).toBe(false)
    expect(matchesQuizAnswerProof("quiz-one", "q1", "7", "invalid")).toBe(false)
  })
})
