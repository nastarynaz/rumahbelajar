import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { Shell, Empty } from "@/components/product/shell"
import { CopyLink } from "@/components/product/copy-link"
import { createQuiz } from "./actions"
import { Button } from "@/components/ui/button"

export default async function QuizSettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams
  const { supabase, membership } = await requireAdmin()
  const [quizzes, attempts] = await Promise.all([
    supabase.from("public_quizzes").select("id,slug,title,is_open,created_at").eq("organization_id", membership.organization_id).order("created_at", { ascending: false }),
    supabase.from("public_quiz_attempts").select("id,full_name,age_years,result,created_at").eq("organization_id", membership.organization_id).order("created_at", { ascending: false }).limit(50),
  ])
  const issue = quizzes.error ?? attempts.error
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? ""
  return <Shell title="Kuis dan formulir" eyebrow="Posttest mandiri" admin action={<Button render={<Link href="/settings/team" />} variant="outline">Tim relawan</Button>}>
    <p className="mb-6 max-w-2xl text-sm leading-6 text-[#4d6156]">Buat soal dan bagikan tautan seperti formulir. Anak mengisi sendiri satu soal per layar. Hasil hanya terlihat oleh admin.</p>
    {query.error && <p role="alert" className="mb-5 rounded-xl border border-[#e8c9b8] bg-[#fff4ed] p-4 text-sm">Kuis belum berhasil dibuat. Periksa judul dan coba lagi.</p>}
    {issue && <p role="alert" className="mb-5 rounded-xl border border-[#e8c9b8] bg-[#fff4ed] p-4 text-sm">Data kuis belum dapat dimuat ({issue.code}). Periksa apakah migrasi kuis sudah selesai di Supabase.</p>}

    <form action={createQuiz} className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-end"><label className="flex-1 text-sm font-semibold">Buat kuis baru<input name="title" className="field mt-2" defaultValue="Posttest Numerasi" minLength={2} maxLength={120} required /></label><Button type="submit">Buat formulir</Button></form>

    <section className="mt-8"><div className="mb-3 flex items-end justify-between gap-3"><h2 className="font-heading text-2xl">Formulir</h2><span className="text-sm text-[#4d6156]">{quizzes.data?.length ?? 0} kuis</span></div>
      {quizzes.data?.length ? <div className="grid gap-4 lg:grid-cols-2">{quizzes.data.map((quiz) => <article key={quiz.id} className="surface p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#a9432b]">{quiz.is_open ? "Terbuka" : "Draf"}</p><h3 className="mt-1 font-heading text-xl">{quiz.title}</h3></div><span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f4dbad] text-xl">✎</span></div><div className="mt-4"><CopyLink url={`${siteUrl}/quiz/${quiz.slug}`} label="Tautan peserta" /></div><div className="mt-4 flex flex-wrap gap-3"><Button render={<Link href={`/settings/quiz/forms/${quiz.id}`} />} variant="default">Edit formulir</Button><Button render={<Link href={`/quiz/${quiz.slug}`} target="_blank" />} variant="outline">Lihat kuis ↗</Button></div></article>)}</div> : !issue && <Empty title="Belum ada kuis" body="Beri judul, lalu buat formulir pertama. Soal awal dapat langsung diedit." />}</section>

    <section className="mt-9"><h2 className="mb-3 font-heading text-2xl">Jawaban masuk</h2>{attempts.data?.length ? <div className="surface overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[#fff6e8]"><tr><th className="p-4">Nama lengkap</th><th className="p-4">Umur</th><th className="p-4">Hasil</th><th className="p-4">Dikirim</th></tr></thead><tbody>{attempts.data.map((attempt) => { const result = attempt.result as { correct: number; total: number }; return <tr key={attempt.id} className="border-t border-[#eadfce]"><td className="p-4 font-semibold"><Link href={`/settings/quiz/${attempt.id}`} className="text-[#2e5a4c] underline">{attempt.full_name}</Link></td><td className="p-4">{attempt.age_years}</td><td className="p-4">{result.correct}/{result.total}</td><td className="p-4">{new Date(attempt.created_at).toLocaleString("id-ID")}</td></tr> })}</tbody></table></div> : !issue && <Empty title="Belum ada jawaban" body="Kiriman anak akan muncul setelah kuis dibagikan dan diisi." />}</section>
  </Shell>
}
