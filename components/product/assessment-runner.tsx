"use client"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { saveResponse } from "@/app/assessments/actions"
import { evaluateLevel, type Answer, type Level } from "@/lib/instrument"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/ui/native-select"

type Snapshot = { version: string; levels: Level[] }
type SaveState = "saved" | "saving" | "offline" | "error" | "dirty"

export function AssessmentRunner({
  id,
  participantName,
  startLevel,
  revision: initialRevision,
  snapshot,
  initialAnswers,
  initialMistakes,
}: {
  id: string
  participantName: string
  startLevel: string
  revision: number
  snapshot: Snapshot
  initialAnswers: Answer[]
  initialMistakes: string[]
}) {
  const startingIndex = Math.max(
    0,
    snapshot.levels.findIndex((level) => level.code === startLevel)
  )
  const firstQuestionId = snapshot.levels[startingIndex].questions.find(
    (item) => item.role === "core" || item.role === "practice"
  )?.id
  const firstAnswer = initialAnswers.find(
    (item) => item.question_id === firstQuestionId
  )
  const [levelIndex, setLevelIndex] = useState(startingIndex)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>(initialAnswers)
  const [mistakes, setMistakes] = useState<string[]>(initialMistakes)
  const [childMode, setChildMode] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [response, setResponse] = useState(firstAnswer?.response ?? "")
  const [help, setHelp] = useState(firstAnswer?.help ?? "")
  const [note, setNote] = useState(firstAnswer?.note ?? "")
  const [saveState, setSaveState] = useState<SaveState>("saved")
  const [error, setError] = useState("")
  const [speechError, setSpeechError] = useState("")
  const revision = useRef(initialRevision)
  const queue = useRef<Answer[]>([])
  const flushing = useRef(false)
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const level = snapshot.levels[levelIndex]
  const items = level.questions.filter(
    (question) =>
      question.role === "core" ||
      question.role === "practice" ||
      (showVerification && question.role === "verification")
  )
  const question = items[questionIndex]
  const current = answers.find((answer) => answer.question_id === question?.id)
  const outcome = evaluateLevel(level, answers)
  const coreCount = level.questions.filter(
    (item) => item.role === "core"
  ).length
  const levelMistakes = level.questions.filter((item) => item.role === "core" && mistakes.includes(item.id)).length
  const stopAtBoundary = snapshot.version !== "tangga-angka-v1" && levelMistakes >= 2

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null
    const wake = async () => {
      try {
        if ("wakeLock" in navigator)
          sentinel = await navigator.wakeLock.request("screen")
      } catch {
        /* Screen lock may be unavailable. */
      }
    }
    void wake()
    return () => {
      if (sentinel) void (sentinel as WakeLockSentinel).release()
    }
  }, [])
  function selectQuestion(index: number, nextItems = items) {
    const saved = answers.find(
      (answer) => answer.question_id === nextItems[index]?.id
    )
    setQuestionIndex(index)
    setResponse(saved?.response ?? "")
    setHelp(saved?.help ?? "")
    setNote(saved?.note ?? "")
    setShowKey(false)
  }

  async function flush() {
    if (flushing.current || !queue.current.length) return
    flushing.current = true
    setSaveState("saving")
    try {
      while (queue.current.length) {
        if (!navigator.onLine) {
          setSaveState("offline")
          return
        }
        const answer = queue.current[0]
        const result = await saveResponse(id, answer, revision.current)
        revision.current = result.revision
        if (queue.current[0] === answer) queue.current.shift()
      }
      setSaveState("saved")
      setError("")
    } catch (cause) {
      setSaveState(navigator.onLine ? "error" : "offline")
      setError(
        cause instanceof Error
          ? cause.message
          : "Belum dapat menyimpan jawaban."
      )
    } finally {
      flushing.current = false
    }
  }
  useEffect(() => {
    const retry = () => void flush()
    window.addEventListener("online", retry)
    return () => window.removeEventListener("online", retry)
  })
  function scheduleDraft(
    nextResponse: string,
    nextHelp: string,
    nextNote: string
  ) {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    const questionId = question.id
    const priorStatus =
      answers.find((item) => item.question_id === questionId)?.status ??
      "not_asked"
    if (priorStatus !== "not_asked") {
      setSaveState("dirty")
      return
    }
    setSaveState("saving")
    draftTimer.current = setTimeout(() => {
      const answer: Answer = {
        question_id: questionId,
        status: priorStatus,
        response: nextResponse.trim() || undefined,
        help: nextHelp || undefined,
        note: nextNote.trim() || undefined,
      }
      setAnswers((previous) => [
        ...previous.filter((item) => item.question_id !== questionId),
        answer,
      ])
      queue.current = [
        ...queue.current.filter((item) => item.question_id !== questionId),
        answer,
      ]
      void flush()
    }, 700)
  }
  function record(status: Answer["status"]) {
    if (draftTimer.current) clearTimeout(draftTimer.current)
    const answer = {
      question_id: question.id,
      status,
      response: response.trim() || undefined,
      help: (status === "assisted" ? help || "Dibantu Kakak" : help) || undefined,
      note: note.trim() || undefined,
    }
    setAnswers((previous) => [
      ...previous.filter((item) => item.question_id !== question.id),
      answer,
    ])
    if (status === "incorrect") setMistakes((previous) => previous.includes(question.id) ? previous : [...previous, question.id])
    queue.current = [
      ...queue.current.filter((item) => item.question_id !== question.id || item.status !== "not_asked"),
      answer,
    ]
    void flush()
    if (status !== "incorrect" && questionIndex < items.length - 1) selectQuestion(questionIndex + 1)
  }
  function switchLevel(next: number) {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
    setLevelIndex(next)
    setShowVerification(false)
    selectQuestion(
      0,
      snapshot.levels[next].questions.filter(
        (item) => item.role === "core" || item.role === "practice"
      )
    )
  }
  function readQuestion() {
    setSpeechError("")
    if (!("speechSynthesis" in window)) {
      setSpeechError("Fitur suara tidak tersedia di perangkat ini.")
      return
    }
    window.speechSynthesis.cancel()
    const speech = new SpeechSynthesisUtterance(question.prompt)
    speech.lang = "id-ID"
    speech.rate = 0.85
    window.speechSynthesis.speak(speech)
  }
  if (!question) return null
  const allCoreAnswered = level.questions
    .filter((item) => item.role === "core")
    .every((item) =>
      answers.some(
        (answer) =>
          answer.question_id === item.id && answer.status !== "not_asked"
      )
    )
  return (
    <main className="min-h-screen bg-[#f8f4ed] p-4 pb-24 text-[#22362f] sm:p-7">
      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[.16em] text-[#a9432b] uppercase">
              {childMode
                ? "Mode tampil ke anak"
                : `Asesmen · ${participantName}`}
            </p>
            <h1 className="mt-1 font-heading text-2xl">
              {childMode
                ? "Tangga Angka"
                : `Level ${level.code} · ${level.title}`}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setChildMode(!childMode)
                setShowKey(false)
              }}
            >
              {childMode ? "Kembali ke relawan" : "Tampil ke anak"}
            </Button>
            {!childMode &&
              (saveState === "saved" ? (
                <Button
                  render={<Link href={`/assessments/${id}/review`} />}
                  variant="outline"
                >
                  Tinjau
                </Button>
              ) : (
                <span
                  className="inline-flex min-h-9 items-center rounded-lg border border-input px-3 text-sm opacity-50"
                  aria-disabled="true"
                >
                  Tunggu tersimpan
                </span>
              ))}
          </div>
        </header>
        {!childMode && (
          <div className="mt-6 flex items-center justify-between text-sm text-[#4d6156]">
            <span>
              Soal {questionIndex + 1} dari {items.length} pada level ini
            </span>
            <span role="status">
              {saveState === "saved"
                ? "Tersimpan"
                : saveState === "saving"
                  ? "Menyimpan..."
                  : saveState === "offline"
                    ? "Belum tersinkron · koneksi putus"
                    : "Belum tersimpan"}
            </span>
          </div>
        )}
        {!childMode && (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8decd]">
            <div
              className="h-full bg-[#2e5a4c]"
              style={{
                width: `${((questionIndex + 1) / items.length) * 100}%`,
              }}
            />
          </div>
        )}
        {error && !childMode && (
          <div
            role="alert"
            className="mt-4 rounded-xl bg-[#fff0e9] p-3 text-sm"
          >
            {error}{" "}
            <Button variant="link" size="sm" onClick={() => void flush()}>
              Coba simpan lagi
            </Button>
          </div>
        )}
        <section className="surface mt-5 p-5 sm:p-8">
          <p className="text-xs font-bold tracking-[.16em] text-[#a9432b] uppercase">
            {question.role === "verification"
              ? "Soal verifikasi"
              : "Kartu soal"}
          </p>
          <h2 className="mt-3 font-heading text-3xl leading-snug sm:text-4xl">
            {question.prompt}
          </h2>
          <Button variant="outline" className="mt-5" onClick={readQuestion}>Dengarkan soal</Button>
          {speechError && <p role="status" className="mt-2 text-sm">{speechError}</p>}
          {question.visual && (
            <div
              className="mt-7 flex min-h-36 flex-wrap items-center justify-center gap-3 rounded-2xl bg-[#fcf8ee] p-5"
              aria-label={
                question.kind === "count"
                  ? `${question.visual.count} benda untuk dihitung`
                  : undefined
              }
            >
              {Array.from(
                { length: question.visual.groups ?? 1 },
                (_, group) => (
                  <div
                    key={group}
                    className="flex flex-wrap justify-center gap-2 rounded-2xl border border-[#e0c99e] p-3"
                  >
                    {Array.from(
                      { length: question.visual!.count },
                      (_, index) => (
                        <span
                          key={index}
                          className="grid min-h-12 min-w-12 place-items-center rounded-xl bg-[#f1d2a6] text-3xl font-semibold"
                        >
                          {question.visual!.symbol}
                        </span>
                      )
                    )}
                  </div>
                )
              )}
            </div>
          )}
          {!childMode && (
            <>
              <div className="mt-6 rounded-xl bg-[#f2f7f3] p-4">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={showKey}
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? "Sembunyikan kunci" : "Tekan untuk lihat kunci"}
                </Button>
                {showKey && (
                  <p className="mt-1 text-sm">
                    Jawaban: <strong>{question.answer}</strong>
                  </p>
                )}
                {question.help && (
                  <p className="mt-2 text-sm text-[#4d6156]">{question.help}</p>
                )}
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="mb-2 block text-sm font-semibold"
                    htmlFor="response"
                  >
                    Jawaban yang dipilih anak
                  </label>
                  <Input
                    id="response"
                    value={response}
                    onChange={(event) => {
                      setResponse(event.target.value)
                      scheduleDraft(event.target.value, help, note)
                    }}
                    maxLength={300}
                    placeholder="Contoh: 9 pada soal 12 ÷ 3"
                  />
                </div>
                <div>
                  <label
                    className="mb-2 block text-sm font-semibold"
                    htmlFor="help"
                  >
                    Alat atau bantuan yang digunakan
                  </label>
                  <NativeSelect
                    id="help"
                    value={help}
                    onChange={(event) => {
                      setHelp(event.target.value)
                      scheduleDraft(response, event.target.value, note)
                    }}
                  >
                    <option value="">Tanpa bantuan / belum dicatat</option>
                    <option>Jari</option>
                    <option>Benda konkret</option>
                    <option>Kartu titik / gambar</option>
                    <option>Coretan</option>
                    <option>Prompt verbal</option>
                  </NativeSelect>
                </div>
              </div>
              <div className="mt-4">
                <label
                  className="mb-2 block text-sm font-semibold"
                  htmlFor="note"
                >
                  Catatan soal, opsional
                </label>
                <Textarea
                  id="note"
                  className="min-h-20"
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value)
                    scheduleDraft(response, help, event.target.value)
                  }}
                  maxLength={1000}
                />
                <p className="mt-1 text-xs text-[#4d6156]">
                  Tulis yang terlihat, bukan label. Contoh: “menghitung
                  satu-satu dengan jari”, bukan “lambat”.
                </p>
                {current && current.status !== "not_asked" && <p className="mt-1 text-xs text-[#4d6156]">Setelah mengubah jawaban atau catatan, tekan status lagi untuk menyimpan.</p>}
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-4">
                <Button onClick={() => record("correct")}>Benar sendiri</Button>
                <Button variant="outline" disabled={!response.trim() || (current?.status === "incorrect" && response.trim() === current.response?.trim())} onClick={() => record("assisted")}>Dibantu Kakak</Button>
                <Button variant="outline" disabled={!response.trim()} onClick={() => record("incorrect")}>
                  Belum tepat
                </Button>
                <Button variant="outline" onClick={() => record("skipped")}>
                  Lewati
                </Button>
              </div>
              {!response.trim() && <p className="mt-2 text-xs text-[#4d6156]">Catat jawaban anak sebelum menandai “Belum tepat”, agar cara berpikirnya dapat ditinjau.</p>}
              {current && (
                <p className="mt-3 text-sm text-[#4d6156]">
                  Tercatat:{" "}
                  {current.status === "correct"
                    ? "Benar sendiri"
                    : current.status === "assisted"
                      ? "Dibantu Kakak"
                    : current.status === "incorrect"
                      ? "Belum tepat"
                      : current.status === "skipped"
                        ? "Dilewati"
                        : "Draft belum dinilai"}
                  . Kamu dapat mengoreksinya dengan memilih status lain.
                </p>
              )}
              <div className="mt-5 flex justify-between">
                <Button
                  variant="ghost"
                  disabled={questionIndex === 0}
                  onClick={() => selectQuestion(questionIndex - 1)}
                >
                  ← Sebelumnya
                </Button>
                <Button
                  variant="ghost"
                  disabled={questionIndex === items.length - 1}
                  onClick={() => selectQuestion(questionIndex + 1)}
                >
                  Berikutnya →
                </Button>
              </div>
            </>
          )}
        </section>
        {!childMode && (allCoreAnswered || stopAtBoundary) && (
          <section className="surface mt-5 p-5" aria-live="polite">
            <h2 className="font-heading text-xl">
              Ringkasan level {level.code}
            </h2>
            <p className="mt-2 text-sm">
              {outcome.score} dari {coreCount} soal inti benar sendiri. Ambang level ini{" "}
              {level.threshold} benar sendiri.{" "}
              {outcome.passed
                ? "Kriteria terpenuhi."
                : "Kriteria belum terpenuhi."}
            </p>
            <p className="mt-1 text-xs text-[#4d6156]">
              {stopAtBoundary ? "Dua soal pada tingkat ini belum tepat. Ini batas sementara; bantu anak menyelesaikan soal terakhir, lalu tinjau hasil."
                : "Jawaban setelah dibantu dicatat sebagai kemajuan belajar, tetapi tidak dihitung lulus mandiri."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {outcome.passed && levelIndex < snapshot.levels.length - 1 && (
                <Button onClick={() => switchLevel(levelIndex + 1)}>
                  Lanjut level berikutnya
                </Button>
              )}
              {levelIndex > 0 && (
                <Button
                  variant="outline"
                  onClick={() => switchLevel(levelIndex - 1)}
                >
                  Turun satu level
                </Button>
              )}
              {!showVerification &&
                level.questions.some(
                  (item) => item.role === "verification"
                ) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowVerification(true)
                      setQuestionIndex(items.length)
                    }}
                  >
                    Gunakan soal verifikasi
                  </Button>
                )}
              {saveState === "saved" ? (
                <Button
                  render={<Link href={`/assessments/${id}/review`} />}
                  variant="outline"
                >
                  Tinjau dan akhiri
                </Button>
              ) : (
                <span
                  className="inline-flex min-h-9 items-center rounded-lg border border-input px-3 text-sm opacity-50"
                  aria-disabled="true"
                >
                  Tunggu tersimpan
                </span>
              )}
            </div>
          </section>
        )}
        {!childMode && (
          <p className="mt-5 text-xs leading-5 text-[#4d6156]">
            Jika koneksi putus, jawaban menunggu di memori tab ini dan dicoba
            lagi saat online. Jangan tutup tab sampai status “Tersimpan”.
          </p>
        )}
      </div>
    </main>
  )
}
