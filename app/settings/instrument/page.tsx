import { requireAdmin } from "@/lib/auth"
import { getInstrument } from "@/lib/data"
import { Shell } from "@/components/product/shell"
export default async function InstrumentPage() {
  await requireAdmin()
  const { snapshot } = await getInstrument()
  return <Shell title="Aturan Tangga Angka" eyebrow={`Instrumen ${snapshot.version}`} admin><p className="mb-6 max-w-2xl text-sm leading-6 text-[#4d6156]">Versi terbit dipertahankan agar hasil lama tetap dapat diaudit. Perubahan aturan memerlukan versi baru melalui migrasi.</p><div className="grid gap-3 sm:grid-cols-2">{snapshot.levels.map((level) => <section className="surface p-5" key={level.code}><h2 className="font-heading text-xl">{level.code} · {level.title}</h2><p className="mt-2 text-sm">Lulus bila {level.threshold} dari {level.questions.filter((question) => question.role === "core").length} soal inti benar.</p><p className="mt-1 text-xs text-[#4d6156]">{level.questions.filter((question) => question.role !== "core").length} soal latihan/verifikasi tidak dihitung.</p></section>)}</div></Shell>
}
