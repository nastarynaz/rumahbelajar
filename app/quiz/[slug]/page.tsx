import { notFound } from "next/navigation"
import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { PublicQuiz } from "@/components/product/public-quiz"
import { quizAnswerProof } from "@/lib/quiz-proof"

export const dynamic = "force-dynamic"

function QuizUnavailable({ slug }: { slug: string }) {
  return <main className="grid min-h-screen place-items-center bg-[#fff7ea] p-4 text-[#22362f]"><section className="surface max-w-md p-7"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#a9432b]">Rumah Belajar</p><h1 className="mt-2 font-heading text-3xl">Kuis belum siap</h1><p className="mt-3 text-sm leading-6 text-[#4d6156]">Pengelola sedang menyiapkan tautan ini. Silakan coba kembali beberapa saat lagi.</p><Link href={`/quiz/${slug}?retry=1`} prefetch={false} className="action-secondary mt-5">Coba lagi</Link></section></main>
}

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(slug)) notFound()
  if (!process.env.SUPABASE_SECRET_KEY) return <QuizUnavailable slug={slug} />
  const admin = createAdminClient()
  const { data: quiz, error: quizError } = await admin.from("public_quizzes").select("id,title,is_open").eq("slug", slug).maybeSingle()
  if (quizError) { console.error("quiz_read_failed", quizError.code); return <QuizUnavailable slug={slug} /> }
  if (!quiz?.is_open) notFound()
  const { data: questions, error } = await admin.from("public_quiz_items").select("code,section,prompt,visual,options,answer,sort_order").eq("quiz_id", quiz.id).order("sort_order")
  if (error || !questions?.length) { if (error) console.error("quiz_items_read_failed", error.code); return <QuizUnavailable slug={slug} /> }
  return <PublicQuiz slug={slug} title={quiz.title} questions={questions.map((question) => ({ id: question.code, section: question.section, prompt: question.prompt, visual: question.visual as { symbol?: string; count?: number; groups?: number; left?: number; right?: number } | null, options: question.options as string[], proof: quizAnswerProof(slug, question.code, question.answer) }))} />
}
