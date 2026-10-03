import Link from "next/link"
import { notFound } from "next/navigation"
import { requireAdmin } from "@/lib/auth"
import { Shell } from "@/components/product/shell"
import { deleteQuizItem, saveQuizItem } from "@/app/settings/quiz/actions"

export default async function QuizItemPage({ params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params
  const { supabase, membership } = await requireAdmin()
  const { data: quiz } = await supabase.from("public_quizzes").select("id,title,is_open").eq("id", id).eq("organization_id", membership.organization_id).maybeSingle()
  if (!quiz) notFound()
  const isNew = itemId === "new"
  const { data: item, error } = isNew ? { data: null, error: null } : await supabase.from("public_quiz_items")
    .select("id,section,prompt,options,answer,is_required,visual").eq("id", itemId).eq("quiz_id", id).eq("organization_id", membership.organization_id).maybeSingle()
  if ((!isNew && !item) || error) notFound()
  const options = item?.options as string[] | undefined
  return <Shell title={isNew ? "Tambah soal" : "Edit soal"} eyebrow={quiz.title} admin action={<Link href={`/settings/quiz/forms/${id}`} className="action-secondary">← Kembali ke editor</Link>}>
    {quiz.is_open && <p role="alert" className="mb-5 rounded-xl border border-[#e8c9b8] bg-[#fff4ed] p-4 text-sm">Tautan sedang terbuka. Tutup dahulu dari editor sebelum mengubah soal.</p>}
    <form action={saveQuizItem} className="surface max-w-2xl space-y-5 p-5 sm:p-7"><input type="hidden" name="quiz_id" value={quiz.id} />{item && <input type="hidden" name="item_id" value={item.id} />}
      <fieldset disabled={quiz.is_open} className="space-y-5 disabled:opacity-60">
        <label className="block text-sm font-semibold">Bagian atau topik<input name="section" className="field mt-2" defaultValue={item?.section ?? "Numerasi"} maxLength={80} required /></label>
        <label className="block text-sm font-semibold">Pertanyaan<textarea name="prompt" className="field mt-2 min-h-28 resize-y" defaultValue={item?.prompt ?? ""} minLength={2} maxLength={500} required placeholder="Tulis pertanyaan dengan bahasa yang mudah dibaca anak" /></label>
        <div><p className="text-sm font-semibold">Pilihan jawaban</p><p className="mt-1 text-xs text-[#4d6156]">Isi 2–6 pilihan. Bulatan di kiri menandai jawaban benar.</p><div className="mt-3 space-y-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="flex items-center gap-3"><label className="grid size-10 shrink-0 place-items-center"><input type="radio" name="answer_index" value={index + 1} defaultChecked={(Boolean(item) && options?.[index] === item?.answer) || (isNew && index === 0)} className="size-5 accent-[#2e5a4c]" /><span className="sr-only">Jawaban benar pilihan {index + 1}</span></label><input name={`option_${index + 1}`} aria-label={`Pilihan ${index + 1}`} className="field" defaultValue={options?.[index] ?? ""} maxLength={80} placeholder={`Pilihan ${index + 1}`} /></div>)}</div></div>
        <label className="flex items-center gap-3 text-sm font-medium"><input name="is_required" type="checkbox" defaultChecked={item?.is_required ?? false} className="size-5 accent-[#2e5a4c]" />Wajib dijawab</label>
        {item?.visual && <label className="flex items-center gap-3 text-sm font-medium"><input name="keep_visual" type="checkbox" defaultChecked className="size-5 accent-[#2e5a4c]" />Pertahankan ilustrasi bawaan</label>}
        <button className="action">Simpan soal</button>
      </fieldset>
    </form>
    {item && <form action={deleteQuizItem} className="mt-5"><input type="hidden" name="quiz_id" value={quiz.id} /><input type="hidden" name="item_id" value={item.id} /><button disabled={quiz.is_open} className="min-h-11 rounded-xl border border-[#d9b5a8] px-4 font-semibold text-[#9c3f2b] disabled:opacity-50">Hapus soal</button></form>}
  </Shell>
}
