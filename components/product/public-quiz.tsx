"use client"

import Image from "next/image"
import { useRef, useState, useTransition } from "react"
import { checkQuizAnswer, submitQuiz } from "@/app/quiz/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Question = {
  id: string
  section: string
  prompt: string
  visual: {
    symbol?: string
    count?: number
    groups?: number
    left?: number
    right?: number
  } | null
  options: string[]
  proof: string
}

export function PublicQuiz({
  slug,
  title,
  questions,
}: {
  slug: string
  title: string
  questions: Question[]
}) {
  const [step, setStep] = useState(-1)
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState("")
  const [speechError, setSpeechError] = useState("")
  const [pending, startTransition] = useTransition()
  const submissionKey = useRef<string | null>(null)
  const question = questions[step]

  function goToStep(index: number) {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
    setSpeechError("")
    setError("")
    setStep(index)
  }

  function readQuestion() {
    setSpeechError("")
    if (!("speechSynthesis" in window)) {
      setSpeechError("Fitur suara tidak tersedia di perangkat ini.")
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(question.prompt)
    utterance.lang = "id-ID"
    utterance.rate = 0.85
    window.speechSynthesis.speak(utterance)
  }

  async function checkAndContinue() {
    const value = answers[question.id]
    if (!value || checking || pending) return
    setError("")
    setChecking(true)
    try {
      const result = await checkQuizAnswer(slug, { questionId: question.id, value, proof: question.proof })
      if (!result.correct) {
        setError("Belum tepat. Coba hitung lagi, ya!")
        return
      }
      if (step < questions.length - 1) goToStep(step + 1)
      else send()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Jawaban belum dapat diperiksa. Coba lagi.")
    } finally {
      setChecking(false)
    }
  }

  function send() {
    if (!submissionKey.current) submissionKey.current = crypto.randomUUID()
    startTransition(async () => {
      try {
        await submitQuiz(slug, {
          submissionKey: submissionKey.current,
          fullName: name,
          ageYears: Number(age),
          answers: Object.entries(answers).map(([question_id, value]) => ({
            question_id,
            value,
          })),
          website: "",
        })
        setDone(true)
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Jawaban belum terkirim. Coba lagi."
        )
      }
    })
  }

  return (
    <main className="min-h-screen bg-[#fff7ea] px-4 py-6 text-[#22362f] sm:py-9">
      <div className="mx-auto max-w-2xl">
        <header className="flex items-center justify-between gap-3">
          <Image
            src="/logo-rumah-belajar-satu-baris.svg"
            alt="Rumah Belajar"
            width={180}
            height={54}
            className="h-11 w-auto"
            priority
          />
          <span className="rounded-full bg-[#f4dbad] px-3 py-1.5 text-xs font-bold text-[#704116]">
            Kuis mandiri
          </span>
        </header>

        {done ? (
          <section className="surface mt-9 p-7 text-center sm:p-10">
            <div
              aria-hidden
              className="mx-auto grid size-14 place-items-center rounded-full bg-[#e7f2eb] text-3xl text-[#2e5a4c]"
            >
              ✓
            </div>
            <h1 className="mt-5 font-heading text-3xl">Kuis selesai, kamu hebat hari ini!</h1>
            <p className="mx-auto mt-3 max-w-md leading-7 text-[#4d6156]">
              Terima kasih sudah mencoba. Setiap soal membantu pendamping
              memahami cara belajarmu.
            </p>
          </section>
        ) : step === -1 ? (
          <section className="surface mt-9 p-6 sm:p-9">
            <p className="text-xs font-bold tracking-[.17em] text-[#a9432b] uppercase">
              Siap bermain?
            </p>
            <h1 className="mt-2 font-heading text-3xl">{title}</h1>
            <p className="mt-3 leading-7 text-[#4d6156]">
              Kerjakan satu soal setiap kali. Kalau belum tepat, coba lagi dengan
              santai sampai kamu siap lanjut.
            </p>
            <div className="mt-7 grid gap-5">
              <label className="block text-sm font-semibold">
                Nama lengkap
                <Input
                  className="mt-2"
                  autoComplete="name"
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nama lengkap peserta"
                />
              </label>
              <label className="block text-sm font-semibold">
                Umur (tahun)
                <Input
                  type="number"
                  inputMode="numeric"
                  min={4}
                  max={99}
                  className="mt-2"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  placeholder="Contoh: 10"
                />
              </label>
              <p className="text-xs leading-5 text-[#4d6156]">
                Nama, umur, dan jawaban hanya dapat dilihat admin Rumah Belajar
                untuk meninjau proses belajar.
              </p>
              <Button
                className="w-full"
                disabled={
                  name.trim().length < 2 ||
                  !age ||
                  Number(age) < 4 ||
                  Number(age) > 99
                }
                onClick={() => goToStep(0)}
              >
                Mulai kuis →
              </Button>
            </div>
          </section>
        ) : (
          <>
            <p className="mt-8 text-sm font-semibold text-[#4d6156]">{question.section}</p>
            <section className="surface mt-5 p-6 sm:p-9">
              <h1 className="mt-4 font-heading text-3xl leading-snug">
                {question.prompt}
              </h1>
              <Button variant="outline" className="mt-4" onClick={readQuestion}>
                Dengarkan soal
              </Button>
              {speechError && (
                <p role="status" className="mt-2 text-sm">
                  {speechError}
                </p>
              )}
              {question.visual && (
                <div className="mt-6 flex flex-wrap justify-center gap-3 rounded-2xl bg-[#fff4df] p-5">
                  {question.visual.left !== undefined ? (
                    <>
                      <span className="grid min-h-16 min-w-20 place-items-center rounded-xl bg-[#f1d2a6] text-3xl">
                        {question.visual.left}
                      </span>
                      <span className="grid min-h-16 min-w-20 place-items-center rounded-xl bg-[#f1d2a6] text-3xl">
                        {question.visual.right}
                      </span>
                    </>
                  ) : (
                    Array.from(
                      { length: question.visual.groups ?? 1 },
                      (_, group) => (
                        <div
                          key={group}
                          className="flex flex-wrap justify-center gap-2 rounded-xl border border-[#e0c99e] p-3"
                        >
                          {Array.from(
                            { length: question.visual!.count ?? 0 },
                            (_, index) => (
                              <span
                                key={index}
                                className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-[#f1d2a6] text-2xl"
                              >
                                {question.visual!.symbol}
                              </span>
                            )
                          )}
                        </div>
                      )
                    )
                  )}
                </div>
              )}
              <fieldset className="mt-7">
                <legend className="text-sm font-semibold">
                  Pilih satu jawaban
                </legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {question.options.map((option, index) => (
                    <label
                      key={option}
                      className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-lg font-semibold transition-colors ${answers[question.id] === option ? "border-[#2e5a4c] bg-[#e9f2ec]" : "border-[#ead7b9] bg-white hover:border-[#dba96a]"}`}
                    >
                      <input
                        type="radio"
                        disabled={checking || pending}
                        className="size-5 shrink-0 accent-[#2e5a4c]"
                        name={question.id}
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={() => {
                          setError("")
                          setAnswers((previous) => ({
                            ...previous,
                            [question.id]: option,
                          }))
                        }}
                      />
                      <span className="min-w-0 break-words">
                        <span
                          aria-hidden
                          className="mr-2 text-sm text-[#8b6a46]"
                        >
                          {String.fromCharCode(65 + index)}.
                        </span>
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {error && (
                <p
                  role="alert"
                  className="mt-5 rounded-xl border border-[#e8c9b8] bg-[#fff4ed] p-3 text-sm"
                >
                  {error}
                </p>
              )}
              <div className="mt-6 flex flex-wrap justify-between gap-3">
                <Button variant="outline" disabled={checking || pending} onClick={() => goToStep(step - 1)}>
                  ← Kembali
                </Button>
                <Button
                  disabled={checking || pending || !answers[question.id]}
                  onClick={checkAndContinue}
                >
                  {checking ? "Memeriksa..." : pending ? "Mengirim..." : step < questions.length - 1 ? "Periksa dan lanjut →" : "Periksa dan kirim"}
                </Button>
              </div>
            </section>
            <p className="mt-5 text-center text-xs text-[#4d6156]">
              Jawaban disimpan setelah soal terakhir berhasil dikirim.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
