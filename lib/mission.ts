import { levels, type LevelCode } from "./instrument"

export type MissionItem = {
  id: string
  prompt: string
  options: string[]
  answer: string
  phase: "pemanasan" | "belajar hari ini"
}

const overrides: Record<string, { prompt?: string; options?: string[]; answer?: string }> = {
  "a2-1": { prompt: "Mana gambar yang berisi 2 titik?", options: ["●", "●●", "●●●", "●●●●"], answer: "●●" },
  "a2-2": { prompt: "Ada berapa bintang? ★★★", options: ["1", "2", "3", "4"] },
  "a2-3": { prompt: "Mana gambar yang berisi 5 titik?", options: ["●●●", "●●●●", "●●●●●", "●●●●●●"], answer: "●●●●●" },
  "b2-1": { prompt: "Mana angka satu?", options: ["1", "2", "3", "4"] },
  "b2-2": { prompt: "Mana angka untuk dua titik: ●●?", options: ["1", "2", "3", "4"] },
  "b2-3": { prompt: "Mana angka untuk tiga titik: ●●●?", options: ["1", "2", "3", "4"] },
  "c2-1": { options: ["47", "74", "40", "70"] },
  "c2-2": { options: ["30", "38", "40", "49"] },
  "c2-3": { options: ["53", "8", "35", "305"] },
  "h-3": { options: ["2 sisa 3", "3 sisa 2", "4 sisa 1", "5 sisa 2"] },
  "i-1": { options: ["4 ribu", "8 ribu", "12 ribu", "16 ribu"] },
}

function numericOptions(answer: string): string[] {
  const value = Number(answer)
  if (!Number.isFinite(value)) throw new Error(`Pilihan soal belum tersedia: ${answer}`)
  const candidates = value < 10
    ? [value - 2, value - 1, value, value + 1, value + 2]
    : [value - 10, value - 1, value, value + 1, value + 10]
  const options = [...new Set(candidates.filter((number) => number >= 0).map(String))]
  return options.slice(Math.max(0, options.indexOf(answer) - 2), Math.max(0, options.indexOf(answer) - 2) + 4)
}

export function missionForLevel(code: LevelCode): MissionItem[] {
  const index = levels.findIndex((level) => level.code === code)
  if (index < 0) throw new Error("Tingkat kuis tidak tersedia.")
  const current = levels[index]
  const warmup = levels[Math.max(0, index - 1)].questions.slice(0, 3)
  const today = current.questions.slice(0, 2)
  return [...warmup.map((question) => ({ question, phase: "pemanasan" as const })),
    ...today.map((question) => ({ question, phase: "belajar hari ini" as const }))]
    .map(({ question, phase }, position) => ({
      id: `${code}-${position + 1}`,
      prompt: overrides[question.id]?.prompt ?? question.prompt,
      options: overrides[question.id]?.options ?? numericOptions(question.answer),
      answer: overrides[question.id]?.answer ?? question.answer,
      phase,
    }))
}
