export type ResponseStatus = "correct" | "incorrect" | "skipped" | "not_asked"
export type LevelCode = "A" | "B" | "C" | "D1" | "D2" | "E" | "F"
export type Question = {
  id: string
  level: LevelCode
  prompt: string
  answer: string
  role: "core" | "practice" | "verification" | "closing"
  kind: "count" | "recognize" | "arithmetic" | "story" | "compare" | "activity"
  visual?: { symbol: string; count: number; groups?: number }
  help?: string
}
export type Level = { code: LevelCode; title: string; threshold: number; questions: Question[] }

export const instrumentVersion = "tangga-angka-v1"
export const levels: Level[] = [
  { code: "A", title: "Menghitung benda", threshold: 2, questions: [
    { id: "a-1", level: "A", prompt: "Ayo hitung bersama dari 1 sampai 10.", answer: "1–10", role: "practice", kind: "activity" },
    { id: "a-2", level: "A", prompt: "Ada berapa bintang?", answer: "7", role: "core", kind: "count", visual: { symbol: "★", count: 7 } },
    { id: "a-3", level: "A", prompt: "Ambilkan 5 benda.", answer: "5", role: "core", kind: "activity" },
  ] },
  { code: "B", title: "Angka 1–9", threshold: 4, questions: [
    ...[3, 7, 5, 9, 2].map((n, i): Question => ({ id: `b-${i + 1}`, level: "B", prompt: "Angka berapa ini?", answer: String(n), role: "core", kind: "recognize", visual: { symbol: String(n), count: 1 }, help: "Kartu titik boleh digunakan untuk mencocokkan." })),
    ...[4, 8].map((n, i): Question => ({ id: `b-v${i + 1}`, level: "B", prompt: "Angka berapa ini?", answer: String(n), role: "verification", kind: "recognize", visual: { symbol: String(n), count: 1 } })),
  ] },
  { code: "C", title: "Angka 10–99", threshold: 4, questions: [
    ...[14, 27, 60, 83, 51].map((n, i): Question => ({ id: `c-${i + 1}`, level: "C", prompt: "Angka berapa ini?", answer: String(n), role: "core", kind: "recognize", visual: { symbol: String(n), count: 1 } })),
    { id: "c-v1", level: "C", prompt: "Mana yang lebih besar, 38 atau 83?", answer: "83", role: "verification", kind: "compare" },
  ] },
  { code: "D1", title: "Tambah dan kurang dasar", threshold: 2, questions: [
    { id: "d1-1", level: "D1", prompt: "6 + 3 = ?", answer: "9", role: "core", kind: "arithmetic", help: "Jari atau benda hitung boleh digunakan." },
    { id: "d1-2", level: "D1", prompt: "9 − 4 = ?", answer: "5", role: "core", kind: "arithmetic" },
    { id: "d1-v1", level: "D1", prompt: "5 + 4 = ?", answer: "9", role: "verification", kind: "arithmetic" },
    { id: "d1-v2", level: "D1", prompt: "8 − 3 = ?", answer: "5", role: "verification", kind: "arithmetic" },
  ] },
  { code: "D2", title: "Menyimpan dan meminjam", threshold: 2, questions: [
    { id: "d2-1", level: "D2", prompt: "27 + 15 = ?", answer: "42", role: "core", kind: "arithmetic", help: "Coretan di kertas boleh digunakan." },
    { id: "d2-2", level: "D2", prompt: "42 − 17 = ?", answer: "25", role: "core", kind: "arithmetic" },
    { id: "d2-v1", level: "D2", prompt: "53 − 26 = ?", answer: "27", role: "verification", kind: "arithmetic" },
  ] },
  { code: "E", title: "Perkalian", threshold: 2, questions: [
    { id: "e-1", level: "E", prompt: "3 × 4 = ?", answer: "12", role: "core", kind: "arithmetic", visual: { symbol: "●", count: 4, groups: 3 } },
    { id: "e-2", level: "E", prompt: "6 × 7 = ?", answer: "42", role: "core", kind: "arithmetic" },
    { id: "e-3", level: "E", prompt: "Ada 4 tim bola. Tiap tim 5 anak. Semuanya berapa anak?", answer: "20", role: "core", kind: "story" },
  ] },
  { code: "F", title: "Pembagian dan cerita", threshold: 2, questions: [
    { id: "f-1", level: "F", prompt: "12 ÷ 3 = ?", answer: "4", role: "core", kind: "arithmetic", visual: { symbol: "●", count: 4, groups: 3 } },
    { id: "f-2", level: "F", prompt: "56 ÷ 7 = ?", answer: "8", role: "core", kind: "arithmetic" },
    { id: "f-3", level: "F", prompt: "Ada 3 kantong berisi 6 kelereng. Lima diberikan ke teman. Berapa sisanya?", answer: "13", role: "core", kind: "story" },
  ] },
]

export const instrumentSnapshot = { version: instrumentVersion, levels }
export type Answer = { question_id: string; status: ResponseStatus; response?: string; help?: string; note?: string }

export function evaluateLevel(level: Level, answers: Answer[]) {
  const core = level.questions.filter((question) => question.role === "core")
  const score = core.filter((question) => answers.find((answer) => answer.question_id === question.id)?.status === "correct").length
  const asked = core.filter((question) => {
    const status = answers.find((answer) => answer.question_id === question.id)?.status
    return status === "correct" || status === "incorrect"
  }).length
  return { score, total: core.length, threshold: level.threshold, asked, passed: score >= level.threshold, complete: core.every((question) => answers.some((answer) => answer.question_id === question.id && answer.status !== "not_asked")) }
}

export function highestPassed(snapshot: typeof instrumentSnapshot, answers: Answer[]) {
  return snapshot.levels.filter((level) => evaluateLevel(level, answers).passed).at(-1)?.code ?? null
}

export function groupForLevel(level: LevelCode | null) {
  if (!level) return null
  if (level === "A" || level === "B") return "awal"
  if (level === "C" || level === "D1") return "tengah"
  return "lanjut"
}
