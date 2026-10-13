import { describe, expect, it } from "vitest"
import { levels } from "./instrument"
import { missionForLevel } from "./mission"

describe("Kuis Misi", () => {
  it("setiap tingkat punya tiga pemanasan dan dua soal materi hari ini", () => {
    for (const level of levels) {
      const questions = missionForLevel(level.code)
      expect(questions).toHaveLength(5)
      expect(questions.map((question) => question.phase)).toEqual([
        "pemanasan", "pemanasan", "pemanasan", "belajar hari ini", "belajar hari ini",
      ])
      for (const question of questions) {
        expect(question.options).toHaveLength(4)
        expect(question.options).toContain(question.answer)
        expect(new Set(question.options).size).toBe(4)
      }
    }
  })
})
