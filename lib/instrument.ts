export type ResponseStatus = "correct" | "assisted" | "incorrect" | "skipped" | "not_asked"
export type LevelCode = "A" | "B" | "C" | "D1" | "D2" | "E" | "F" | "G" | "H" | "I"
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

export const instrumentVersion = "tangga-angka-v2"
export const levels: Level[] = [
  { code: "A", title: "Membilang benda", threshold: 2, questions: [
    { id: "a2-1", level: "A", prompt: "Ambilkan 2 kancing.", answer: "2", role: "core", kind: "activity" },
    { id: "a2-2", level: "A", prompt: "Ada berapa bintang?", answer: "3", role: "core", kind: "count", visual: { symbol: "★", count: 3 } },
    { id: "a2-3", level: "A", prompt: "Ambilkan 5 kancing.", answer: "5", role: "core", kind: "activity" },
  ] },
  { code: "B", title: "Angka 1–9", threshold: 2, questions: [
    { id: "b2-1", level: "B", prompt: "Tunjuk angka 1.", answer: "1", role: "core", kind: "recognize", visual: { symbol: "1", count: 1 } },
    { id: "b2-2", level: "B", prompt: "Pasangkan angka 2 dengan dua titik.", answer: "2", role: "core", kind: "activity" },
    { id: "b2-3", level: "B", prompt: "Pasangkan angka 3 dengan tiga titik.", answer: "3", role: "core", kind: "activity" },
  ] },
  { code: "C", title: "Bilangan 10–99", threshold: 2, questions: [
    { id: "c2-1", level: "C", prompt: "Mana lebih besar, 47 atau 74?", answer: "74", role: "core", kind: "compare" },
    { id: "c2-2", level: "C", prompt: "Angka sesudah 39 berapa?", answer: "40", role: "core", kind: "recognize" },
    { id: "c2-3", level: "C", prompt: "3 puluhan dan 5 satuan jadi berapa?", answer: "35", role: "core", kind: "activity" },
  ] },
  { code: "D1", title: "Tambah dan kurang dasar", threshold: 2, questions: [
    { id: "d12-1", level: "D1", prompt: "23 + 14 = ?", answer: "37", role: "core", kind: "arithmetic" },
    { id: "d12-2", level: "D1", prompt: "46 − 15 = ?", answer: "31", role: "core", kind: "arithmetic" },
    { id: "d12-3", level: "D1", prompt: "48 − 13 = ?", answer: "35", role: "core", kind: "arithmetic" },
  ] },
  { code: "D2", title: "Menyimpan dan meminjam", threshold: 2, questions: [
    { id: "d22-1", level: "D2", prompt: "42 − 17 = ?", answer: "25", role: "core", kind: "arithmetic" },
    { id: "d22-2", level: "D2", prompt: "35 − 18 = ?", answer: "17", role: "core", kind: "arithmetic" },
    { id: "d22-3", level: "D2", prompt: "38 + 45 = ?", answer: "83", role: "core", kind: "arithmetic" },
  ] },
  { code: "E", title: "Perkalian", threshold: 2, questions: [
    { id: "e2-1", level: "E", prompt: "3 × 4 = ?", answer: "12", role: "core", kind: "arithmetic", visual: { symbol: "●", count: 4, groups: 3 } },
    { id: "e2-2", level: "E", prompt: "5 × 3 = ?", answer: "15", role: "core", kind: "arithmetic" },
    { id: "e2-3", level: "E", prompt: "2 × 6 = ?", answer: "12", role: "core", kind: "arithmetic" },
  ] },
  { code: "F", title: "Pembagian dan cerita", threshold: 2, questions: [
    { id: "f2-1", level: "F", prompt: "12 ÷ 3 = ?", answer: "4", role: "core", kind: "arithmetic" },
    { id: "f2-2", level: "F", prompt: "15 ÷ 5 = ?", answer: "3", role: "core", kind: "arithmetic" },
    { id: "f2-3", level: "F", prompt: "20 kue dibagi rata ke 4 piring. Tiap piring berapa?", answer: "5", role: "core", kind: "story" },
  ] },
  { code: "G", title: "Ratusan dan nilai tempat", threshold: 2, questions: [
    { id: "g-1", level: "G", prompt: "Pada 345, angka ratusannya berapa?", answer: "3", role: "core", kind: "recognize" },
    { id: "g-2", level: "G", prompt: "125 + 248 = ?", answer: "373", role: "core", kind: "arithmetic" },
    { id: "g-3", level: "G", prompt: "300 − 145 = ?", answer: "155", role: "core", kind: "arithmetic" },
  ] },
  { code: "H", title: "Kali dan bagi lanjutan", threshold: 2, questions: [
    { id: "h-1", level: "H", prompt: "14 × 3 = ?", answer: "42", role: "core", kind: "arithmetic" },
    { id: "h-2", level: "H", prompt: "23 × 4 = ?", answer: "92", role: "core", kind: "arithmetic" },
    { id: "h-3", level: "H", prompt: "17 ÷ 5 = ? Sebutkan sisanya.", answer: "3 sisa 2", role: "core", kind: "arithmetic" },
  ] },
  { code: "I", title: "Cerita dua langkah dan pecahan", threshold: 2, questions: [
    { id: "i-1", level: "I", prompt: "3 buku masing-masing 4 ribu. Bayar 20 ribu. Kembalinya?", answer: "8 ribu", role: "core", kind: "story" },
    { id: "i-2", level: "I", prompt: "Setengah dari 12 berapa?", answer: "6", role: "core", kind: "story" },
    { id: "i-3", level: "I", prompt: "Seperempat dari 20 berapa?", answer: "5", role: "core", kind: "story" },
  ] },
]

export const instrumentSnapshot = { version: instrumentVersion, levels }
export type Answer = { question_id: string; status: ResponseStatus; response?: string; help?: string; note?: string }

export function evaluateLevel(level: Level, answers: Answer[]) {
  const core = level.questions.filter((question) => question.role === "core")
  const score = core.filter((question) => {
    const answer = answers.find((item) => item.question_id === question.id)
    return answer?.status === "correct"
  }).length
  const asked = core.filter((question) => {
    const status = answers.find((answer) => answer.question_id === question.id)?.status
    return status === "correct" || status === "assisted" || status === "incorrect"
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
