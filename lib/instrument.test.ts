import { describe, expect, it } from "vitest"
import { evaluateLevel, groupForLevel, highestPassed, instrumentSnapshot, levels, type Answer } from "./instrument"

const correct = (ids: string[]): Answer[] => ids.map((question_id) => ({ question_id, status: "correct" }))
describe("aturan Tangga Angka", () => {
  it.each(levels.map((level) => [level.code, level] as const))("level %s memakai ambang soal inti", (_, level) => {
    const core = level.questions.filter((question) => question.role === "core")
    expect(evaluateLevel(level, correct(core.slice(0, level.threshold).map((q) => q.id))).passed).toBe(true)
    expect(evaluateLevel(level, correct(core.slice(0, level.threshold - 1).map((q) => q.id))).passed).toBe(false)
  })
  it("verifikasi C tidak mengubah ambang 4 dari 5", () => {
    expect(evaluateLevel(levels[2], correct(["c-1","c-2","c-3","c-v1"]).concat({question_id:"c-4",status:"skipped"})).passed).toBe(false)
  })
  it("skipped dan not_asked tidak dihitung benar", () => {
    expect(evaluateLevel(levels[0], [{question_id:"a-2",status:"skipped"},{question_id:"a-3",status:"not_asked"}]).score).toBe(0)
  })
  it("hasil adalah level tertinggi yang terbukti, bukan terakhir dibuka", () => {
    expect(highestPassed(instrumentSnapshot, correct(["a-2","a-3","b-1","b-2","b-3","b-4","c-1"]))).toBe("B")
    expect(groupForLevel("B")).toBe("awal")
    expect(groupForLevel("D1")).toBe("tengah")
    expect(groupForLevel("E")).toBe("lanjut")
  })
})
