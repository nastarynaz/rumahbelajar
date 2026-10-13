"use client"

import Link from "next/link"
import { useRef, useState, useTransition } from "react"
import { submitMission } from "@/app/mission/actions"
import type { LevelCode } from "@/lib/instrument"
import type { MissionItem } from "@/lib/mission"
import { Button } from "@/components/ui/button"

type Answer = { id: string; selected: string; assisted: boolean; audioUses: number }
type VisibleItem = Omit<MissionItem, "answer">

export function MissionRunner({ participantId, level, questions }: {
  participantId: string
  level: LevelCode
  questions: VisibleItem[]
}) {
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const submissionKey = useRef<string | null>(null)
  const question = questions[step]
  const answer = question ? answers[question.id] : undefined

  function update(patch: Partial<Answer>) {
    setAnswers((previous) => ({ ...previous, [question.id]: {
      id: question.id,
      selected: previous[question.id]?.selected ?? "",
      assisted: previous[question.id]?.assisted ?? false,
      audioUses: previous[question.id]?.audioUses ?? 0,
      ...patch,
    } }))
  }

  function readQuestion() {
    if (!("speechSynthesis" in window)) {
      setError("Fitur suara tidak tersedia di perangkat ini.")
      return
    }
    setError("")
    window.speechSynthesis.cancel()
    const speech = new SpeechSynthesisUtterance(question.prompt)
    speech.lang = "id-ID"
    speech.rate = 0.85
    window.speechSynthesis.speak(speech)
    update({ audioUses: Math.min(20, (answer?.audioUses ?? 0) + 1) })
  }

  function next() {
    if (!answer?.selected) return
    setError("")
    if (step < questions.length - 1) {
      setStep(step + 1)
      return
    }
    startTransition(async () => {
      try {
        if (!submissionKey.current) submissionKey.current = crypto.randomUUID()
        await submitMission({ participantId, submissionKey: submissionKey.current, level, answers: questions.map((item) => answers[item.id]) })
        setDone(true)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Kuis belum tersimpan.")
      }
    })
  }

  return <main className="min-h-screen bg-[#fff7ea] px-4 py-8 text-[#22362f]">
    <div className="mx-auto max-w-2xl">
      <header className="flex items-center justify-between gap-3">
        <span className="font-heading text-xl">Rumah Belajar</span>
        <span className="rounded-full bg-[#f4dbad] px-3 py-1.5 text-xs font-bold">Kuis Misi</span>
      </header>
      {done ? <section className="surface mt-8 p-8 text-center">
        <div aria-hidden className="text-5xl">★</div>
        <h1 className="mt-5 font-heading text-3xl">Kuis selesai, kamu hebat hari ini!</h1>
        <p className="mt-3 text-[#4d6156]">Terima kasih sudah mencoba semua misi.</p>
        <Button render={<Link href={`/participants/${participantId}`} />} className="mt-7">Kembali ke catatan relawan</Button>
      </section> : step < 0 ? <section className="surface mt-8 p-8">
        <p className="text-sm font-semibold text-[#a9432b]">Misi hari ini</p>
        <h1 className="mt-2 font-heading text-3xl">Lima tantangan kecil</h1>
        <p className="mt-3 leading-7 text-[#4d6156]">Coba satu per satu. Kakak bisa membacakan atau membantu kapan saja.</p>
        <Button className="mt-7 w-full" onClick={() => setStep(0)}>Mulai misi →</Button>
      </section> : <>
        <div className="mt-8 flex items-center justify-between text-sm text-[#4d6156]">
          <span>Misi {step + 1} dari 5</span><span>{question.phase === "pemanasan" ? "Pemanasan" : "Belajar hari ini"}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e8decd]"><div className="h-full bg-[#2e5a4c]" style={{ width: `${(step + 1) * 20}%` }} /></div>
        <section className="surface mt-5 p-6 sm:p-9">
          <h1 className="font-heading text-3xl leading-snug">{question.prompt}</h1>
          <Button variant="outline" className="mt-5" onClick={readQuestion}>Dengarkan soal</Button>
          <fieldset className="mt-7">
            <legend className="text-sm font-semibold">Pilih satu jawaban</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {question.options.map((option) => <label key={option} className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-xl font-semibold ${answer?.selected === option ? "border-[#2e5a4c] bg-[#e9f2ec]" : "border-[#ead7b9] bg-white"}`}>
                <input type="radio" className="size-5 accent-[#2e5a4c]" name={question.id} value={option} checked={answer?.selected === option} onChange={() => update({ selected: option })} />
                <span className="break-words">{option}</span>
              </label>)}
            </div>
          </fieldset>
          <div className="mt-7 rounded-xl bg-[#f2f7f3] p-4">
            <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" className="size-5" checked={answer?.assisted ?? false} onChange={(event) => update({ assisted: event.target.checked })} />Dibantu Kakak pada soal ini</label>
          </div>
          {error && <p role="alert" className="mt-5 text-sm text-[#a9432b]">{error}</p>}
          <div className="mt-7 flex justify-between gap-3">
            <Button variant="outline" disabled={pending} onClick={() => setStep(step - 1)}>← Kembali</Button>
            <Button disabled={!answer?.selected || pending} onClick={next}>{pending ? "Menyimpan..." : step === 4 ? "Selesai" : "Lanjut →"}</Button>
          </div>
        </section>
      </>}
    </div>
  </main>
}
