import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { Shell } from "@/components/product/shell"
import { CopyLink } from "@/components/product/copy-link"
import { saveQuizTitle, toggleQuizOpen } from "@/app/settings/quiz/actions"

export default async function QuizBuilderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const { supabase, membership } = await requireAdmin()
  const [quizResult, itemsResult] = await Promise.all([
    supabase.from("public_quizzes").select("id,slug,title,is_open").eq("id", id).eq("organization_id", membership.organization_id).maybeSingle(),
    supabase.from("public_quiz_items").select("id,sort_order,section,prompt,options,is_required").eq("quiz_id", id).eq("organization_id", membership.organization_id).order("sort_order"),
  ])
  if (!quizResult.data && !quizResult.error) notFound()
  const quiz = quizResult.data
  const issue = quizResult.error ?? itemsResult.error
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? ""
  return <Shell title={quiz?.title ?? "Editor kuis"} eyebrow="Buat seperti formulir" admin action={<Link href="/settings/quiz" className="action-secondary">← Semua kuis</Link>}>
    {issue && <p role="alert" className="mb-5 rounded-xl border border-[#e8c9b8] bg-[#fff4ed] p-4 text-sm">Editor belum dapat memuat data ({issue.code}). Pastikan migrasi kuis terbaru sudah dijalankan.</p>}
    {query.error && <p role="alert" className="mb-5 rounded-xl border border-[#e8c9b8] bg-[#fff4ed] p-4 text-sm">{query.error === "close" ? "Tutup tautan kuis sebelum mengubah soal." : query.error === "empty" ? "Tambahkan minimal satu soal sebelum membuka tautan." : "Perubahan belum tersimpan. Periksa isian dan coba lagi."}</p>}
    {query.saved && <p role="status" className="mb-5 rounded-xl border border-[#bdd7c7] bg-[#edf6ef] p-4 text-sm">Perubahan berhasil disimpan.</p>}
    {quiz && <>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="surface p-5"><h2 className="font-heading text-xl">Informasi kuis</h2><form action={saveQuizTitle} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><input type="hidden" name="quiz_id" value={quiz.id} /><label className="flex-1 text-sm font-semibold">Judul<input name="title" className="field mt-2" defaultValue={quiz.title} minLength={2} maxLength={120} required /></label><button className="action">Simpan judul</button></form><div className="mt-5"><CopyLink url={`${siteUrl}/quiz/${quiz.slug}`} /></div><Link href={`/quiz/${quiz.slug}`} target="_blank" className="mt-3 inline-flex min-h-11 items-center font-semibold text-[#2e5a4c] underline">Lihat halaman anak ↗</Link></section>
        <section className="surface flex flex-col justify-between gap-4 p-5"><div><h2 className="font-heading text-xl">Bagikan saat siap</h2><p className="mt-2 text-sm leading-6 text-[#4d6156]">{quiz.is_open ? "Tautan terbuka. Anak dapat mengisi sekarang." : "Tautan ditutup. Edit soal dan periksa tampilannya dulu."}</p><p className="mt-2 text-sm font-semibold text-[#2e5a4c]">{itemsResult.data?.length ?? 0} soal · {quiz.is_open ? "Terbuka" : "Draf"}</p></div><form action={toggleQuizOpen}><input type="hidden" name="quiz_id" value={quiz.id} /><input type="hidden" name="is_open" value={quiz.is_open ? "false" : "true"} /><button className={quiz.is_open ? "action-secondary" : "action"}>{quiz.is_open ? "Tutup untuk mengedit" : "Buka dan bagikan"}</button></form></section>
      </div>
      <section className="mt-8"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-heading text-2xl">Soal kuis</h2><p className="mt-1 text-sm text-[#4d6156]">Anak melihat satu soal per layar. Jawaban benar dihitung otomatis setelah dikirim.</p></div><Link href={`/settings/quiz/forms/${quiz.id}/items/new`} className="action">Tambah soal</Link></div>
        <div className="space-y-3">{itemsResult.data?.map((item, index) => <Link key={item.id} href={`/settings/quiz/forms/${quiz.id}/items/${item.id}`} className="surface flex min-h-20 items-center gap-4 p-4 transition-colors hover:bg-[#fffaf2]"><span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f4dbad] font-bold text-[#704116]">{index + 1}</span><span className="min-w-0 flex-1"><span className="block text-xs font-bold uppercase tracking-[.12em] text-[#a9432b]">{item.section}{item.is_required ? " · Wajib" : ""}</span><strong className="mt-1 block truncate font-semibold">{item.prompt}</strong><small className="text-[#4d6156]">{(item.options as string[]).length} pilihan</small></span><span aria-hidden className="text-[#2e5a4c]">→</span></Link>)}</div>
      </section>
    </>}
  </Shell>
}
