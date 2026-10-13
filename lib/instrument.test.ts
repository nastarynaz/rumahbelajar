import { describe, expect, it } from "vitest"
import { evaluateLevel, groupForLevel, highestPassed, instrumentSnapshot, levels, type Answer } from "./instrument"

const correct = (ids: string[]): Answer[] => ids.map((question_id) => ({ question_id, status: "correct" }))
describe("aturan Tangga Angka", () => {
  it.each(levels.map((level) => [level.code, level] as const))("level %s memakai ambang soal inti", (_, level) => {
    const core = level.questions.filter((question) => question.role === "core")
    expect(evaluateLevel(level, correct(core.slice(0, level.threshold).map((q) => q.id))).passed).toBe(true)
    expect(evaluateLevel(level, correct(core.slice(0, level.threshold - 1).map((q) => q.id))).passed).toBe(false)
  })
  it("setiap tingkat baru memakai tiga soal dan ambang dua mandiri", () => {
    for (const level of levels) {
      expect(level.questions.filter((question) => question.role === "core")).toHaveLength(3)
      expect(level.threshold).toBe(2)
    }
  })
  it("skipped dan not_asked tidak dihitung benar", () => {
    expect(evaluateLevel(levels[0], [{question_id:"a2-2",status:"skipped"},{question_id:"a2-3",status:"not_asked"}]).score).toBe(0)
  })
  it("jawaban dibantu tidak dihitung sebagai lulus mandiri", () => {
    expect(evaluateLevel(levels[0], [
      { question_id: "a2-1", status: "correct" },
      { question_id: "a2-2", status: "assisted", help: "Dibantu Kakak" },
      { question_id: "a2-3", status: "incorrect", help: "Benda konkret" },
    ]).passed).toBe(false)
    expect(evaluateLevel(levels[0], [
      { question_id: "a2-1", status: "correct" },
      { question_id: "a2-2", status: "correct", help: "Benda konkret" },
    ]).passed).toBe(true)
  })
  it("hasil adalah level tertinggi yang terbukti, bukan terakhir dibuka", () => {
    expect(highestPassed(instrumentSnapshot, correct(["a2-1","a2-2","b2-1","b2-2","c2-1"]))).toBe("B")
    expect(groupForLevel("B")).toBe("awal")
    expect(groupForLevel("D1")).toBe("tengah")
    expect(groupForLevel("E")).toBe("lanjut")
  })
})
