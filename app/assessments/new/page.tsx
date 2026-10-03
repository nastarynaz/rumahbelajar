import { randomUUID } from "node:crypto"
import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { Shell, Empty } from "@/components/product/shell"
import { createAssessment } from "@/app/assessments/actions"
import { Button } from "@/components/ui/button"

export default async function NewAssessmentPage({
  searchParams,
}: {
  searchParams: Promise<{ participant?: string }>
}) {
  const { participant } = await searchParams
  const { supabase, membership } = await requireUser()
  const { data, error } = await supabase
    .from("participants")
    .select("id,display_name,start_level")
    .eq("organization_id", membership.organization_id)
    .is("archived_at", null)
    .order("display_name")
  if (error) throw new Error("Peserta belum dapat dimuat.")
  return (
    <Shell
      title="Mulai sesi baru"
      eyebrow="Satu peserta per sesi"
      admin={membership.role === "admin"}
    >
      {!data?.length ? (
        <Empty
          title="Belum ada peserta yang bisa dipilih"
          body={
            membership.role === "admin"
              ? "Tambahkan peserta terlebih dahulu. Setelah itu, pilih namanya di sini untuk memulai sesi asesmen."
              : "Minta admin menambahkan peserta dan menugaskan Anda sebagai relawan. Setelah tersedia, nama peserta akan muncul di sini."
          }
          action={
            membership.role === "admin" ? (
              <Button
                render={<Link href="/settings/participants" />}
                variant="default"
              >
                Tambah peserta
              </Button>
            ) : undefined
          }
        />
      ) : (
        <form
          action={createAssessment}
          className="surface max-w-2xl space-y-5 p-5 sm:p-7"
        >
          <div className="rounded-xl bg-[#f2f7f3] p-4 text-sm leading-6 text-[#4d6156]">
            Buat satu sesi untuk satu peserta. Pilih nama peserta, tentukan
            jenis sesi dan level mulai, lalu mulai asesmen.
          </div>
          <input type="hidden" name="idempotency_key" value={randomUUID()} />
          <div>
            <label
              className="mb-2 block font-semibold"
              htmlFor="participant_id"
            >
              Peserta
            </label>
            <select
              id="participant_id"
              name="participant_id"
              className="field"
              defaultValue={participant ?? data[0].id}
            >
              {data.map((person) => (
                <option value={person.id} key={person.id}>
                  {person.display_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block font-semibold" htmlFor="type">
                Jenis sesi
              </label>
              <select id="type" name="type" className="field">
                <option value="baseline">Baseline</option>
                <option value="posttest">Posttest</option>
                <option value="reassessment">Asesmen ulang</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block font-semibold" htmlFor="assessed_on">
                Tanggal
              </label>
              <input
                id="assessed_on"
                name="assessed_on"
                type="date"
                className="field"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block font-semibold" htmlFor="start_level">
              Level mulai
            </label>
            <select
              id="start_level"
              name="start_level"
              className="field"
              defaultValue={
                data.find((person) => person.id === participant)?.start_level ??
                data[0].start_level
              }
            >
              {["A", "B", "C", "D1", "D2", "E", "F"].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-[#4d6156]">
              Pilih berdasarkan asesmen sebelumnya atau pengamatan relawan.
              Level dapat ditinjau lagi saat sesi berjalan.
            </p>
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Buat dan mulai sesi
          </Button>
        </form>
      )}
    </Shell>
  )
}
