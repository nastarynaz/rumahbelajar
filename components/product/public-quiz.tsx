"use client"
import Image from "next/image"
import { useRef, useState, useTransition } from "react"
import { submitQuiz } from "@/app/quiz/actions"

type Question = { id: string; section: string; prompt: string; visual: { symbol?: string; count?: number; groups?: number; left?: number; right?: number } | null; options: string[] }
export function PublicQuiz({ slug, title, questions }: { slug: string; title: string; questions: Question[] }) {
  const [step, setStep] = useState(-1)
  const [name, setName] = useState("")
  const [age, setAge] = useState("")
  const [answers, setAnswers] = useState<Record<string,string>>({})
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [speechError, setSpeechError] = useState("")
  const [pending, startTransition] = useTransition()
  const submissionKey = useRef<string | null>(null)
  const question = questions[step]
  function goToStep(index: number) {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel()
    setSpeechError("")
    setStep(index)
  }
  function readQuestion() {
    setSpeechError("")
    if (!("speechSynthesis" in window)) { setSpeechError("Fitur suara tidak tersedia di perangkat ini."); return }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(question.prompt)
    utterance.lang = "id-ID"
    utterance.rate = 0.85
    window.speechSynthesis.speak(utterance)
  }
  function send() {
    setError("")
    if (!submissionKey.current) submissionKey.current = crypto.randomUUID()
    startTransition(async () => {
      try {
        await submitQuiz(slug, { submissionKey: submissionKey.current, fullName: name, ageYears: Number(age), answers: Object.entries(answers).map(([question_id,value]) => ({ question_id, value })), website: "" })
        setDone(true)
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Belum berhasil mengirim.") }
    })
  }
  return <main className="min-h-screen bg-[#f8f4ed] px-4 py-6 text-[#22362f] sm:py-10"><div className="mx-auto max-w-2xl"><header className="flex items-center justify-between gap-3"><Image src="/logo-rumah-belajar-satu-baris.svg" alt="Rumah Belajar" width={180} height={54} className="h-12 w-auto" /><span className="text-xs font-semibold uppercase tracking-[.15em] text-[#a9432b]">Posttest mandiri</span></header>
    {done ? <section className="surface mt-10 p-7 text-center sm:p-10"><div aria-hidden className="mx-auto grid size-14 place-items-center rounded-full bg-[#e7f2eb] text-3xl text-[#2e5a4c]">✓</div><h1 className="mt-5 font-heading text-3xl">Jawaban sudah terkirim</h1><p className="mx-auto mt-3 max-w-md leading-7 text-[#4d6156]">Terima kasih sudah mencoba. Pendamping Rumah Belajar akan meninjau hasilnya. Kamu bisa menutup halaman ini.</p></section> : step === -1 ? <section className="surface mt-10 p-6 sm:p-9"><p className="text-xs font-bold uppercase tracking-[.17em] text-[#a9432b]">Mulai di sini</p><h1 className="mt-2 font-heading text-3xl">{title}</h1><p className="mt-3 leading-7 text-[#4d6156]">Ada {questions.length} soal singkat. Kerjakan pelan-pelan; soal yang sulit boleh dilewati. Tidak ada peringkat.</p><div className="mt-7 grid gap-5"><label className="block text-sm font-semibold">Nama lengkap<input className="field mt-2" autoComplete="name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama lengkap peserta" /></label><label className="block text-sm font-semibold">Umur (tahun)<input type="number" inputMode="numeric" min={4} max={99} className="field mt-2" value={age} onChange={(event) => setAge(event.target.value)} placeholder="Contoh: 10" /></label><p className="text-xs leading-5 text-[#4d6156]">Nama lengkap, umur, dan jawaban dipakai untuk meninjau belajar dan hanya dapat dilihat admin Rumah Belajar. Jangan tulis cerita pribadi.</p><button type="button" className="action w-full" disabled={name.trim().length < 2 || !age || Number(age) < 4 || Number(age) > 99} onClick={() => goToStep(0)}>Mulai kuis</button></div></section> : <><div className="mt-8 flex justify-between text-sm text-[#4d6156]"><span>{question.section}</span><span>Soal {step + 1} dari {questions.length}</span></div><div className="mt-2 h-2 rounded-full bg-[#e8decd]"><div className="h-full rounded-full bg-[#2e5a4c]" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div><section className="surface mt-5 p-6 sm:p-9"><h1 className="font-heading text-3xl leading-snug">{question.prompt}</h1><button type="button" className="action-secondary mt-4" onClick={readQuestion}>Dengarkan soal</button>{speechError && <p role="status" className="mt-2 text-sm">{speechError}</p>}{question.visual && <div className="mt-6 flex flex-wrap justify-center gap-3 rounded-2xl bg-[#fcf8ee] p-5">{question.visual.left !== undefined ? <><span className="grid min-h-16 min-w-20 place-items-center rounded-xl bg-[#f1d2a6] text-3xl">{question.visual.left}</span><span className="grid min-h-16 min-w-20 place-items-center rounded-xl bg-[#f1d2a6] text-3xl">{question.visual.right}</span></> : Array.from({ length: question.visual.groups ?? 1 }, (_, group) => <div key={group} className="flex flex-wrap justify-center gap-2 rounded-xl border border-[#e0c99e] p-3">{Array.from({ length: question.visual!.count ?? 0 }, (_, index) => <span key={index} className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-[#f1d2a6] text-2xl">{question.visual!.symbol}</span>)}</div>)}</div>}<fieldset className="mt-7"><legend className="text-sm font-semibold">Pilih satu jawaban</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">{question.options.map((option) => <label key={option} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 text-lg font-semibold ${answers[question.id] === option ? "border-[#2e5a4c] bg-[#e9f2ec]" : "border-[#c8d3c8] bg-white"}`}><input type="radio" className="size-5 accent-[#2e5a4c]" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => setAnswers((previous) => ({ ...previous, [question.id]: option }))} />{option}</label>)}</div></fieldset><div className="mt-6 flex flex-wrap justify-between gap-3"><button type="button" className="action-secondary" onClick={() => goToStep(step - 1)}>← Kembali</button>{step < questions.length - 1 ? <button type="button" className="action" onClick={() => goToStep(step + 1)}>{answers[question.id] ? "Berikutnya" : "Lewati soal"} →</button> : <button type="button" className="action" disabled={pending} onClick={send}>{pending ? "Mengirim..." : "Kirim jawaban"}</button>}</div>{error && <p role="alert" className="mt-5 rounded-xl bg-[#fff0e9] p-3 text-sm">{error}</p>}</section><p className="mt-5 text-center text-xs text-[#4d6156]">Jawaban tersimpan selama halaman ini terbuka. Jangan tutup halaman sebelum menekan “Kirim jawaban”.</p></>}
  </div></main>
}
