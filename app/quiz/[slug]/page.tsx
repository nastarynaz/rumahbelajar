import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { PublicQuiz } from "@/components/product/public-quiz"

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!/^[a-zA-Z0-9_-]{12,80}$/.test(slug)) notFound()
  const admin = createAdminClient()
  const { data: quiz } = await admin.from("public_quizzes").select("title,version,is_open").eq("slug", slug).single()
  if (!quiz?.is_open) notFound()
  const { data: questions, error } = await admin.from("public_quiz_questions").select("code,section,prompt,visual,options,sort_order").eq("version", quiz.version).order("sort_order")
  if (error || !questions?.length) throw new Error("Soal kuis belum tersedia.")
  return <PublicQuiz slug={slug} title={quiz.title} questions={questions.map((question) => ({ id: question.code, section: question.section, prompt: question.prompt, visual: question.visual as { symbol?: string; count?: number; groups?: number; left?: number; right?: number } | null, options: question.options as string[] }))} />
}
