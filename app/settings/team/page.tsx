import Link from "next/link"
import { requireAdmin } from "@/lib/auth"
import { Shell, Empty } from "@/components/product/shell"
import {
  assignAssessor,
  updateRetention,
  inviteAssessor,
} from "@/app/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectButton,
  SelectItem,
  SelectPopup,
  SelectValue,
} from "@/components/ui/select"

export default async function TeamPage() {
  const { supabase, membership } = await requireAdmin()
  const [members, people, assignments, organization] = await Promise.all([
    supabase
      .from("organization_members")
      .select("user_id,role,profiles(display_name)")
      .eq("organization_id", membership.organization_id),
    supabase
      .from("participants")
      .select("id,display_name")
      .eq("organization_id", membership.organization_id)
      .is("archived_at", null)
      .order("display_name"),
    supabase
      .from("assessor_assignments")
      .select("participant_id,assessor_id")
      .eq("organization_id", membership.organization_id),
    supabase
      .from("organizations")
      .select("retention_months")
      .eq("id", membership.organization_id)
      .single(),
  ])
  if (members.error || people.error || assignments.error || organization.error)
    throw new Error("Pengaturan tim belum dapat dimuat.")
  const assessors =
    members.data?.filter((member) => member.role === "assessor") ?? []
  return (
    <Shell
      title="Tim dan penugasan"
      eyebrow="Pengaturan admin"
      admin
      action={
        <Button render={<Link href="/participants" />} variant="outline">
          Lihat peserta
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="font-heading text-xl">Anggota tim</h2>
          <p className="mt-1 text-sm text-[#4d6156]">
            Undang relawan lewat email kerja yang disetujui.
          </p>
          <form action={inviteAssessor} className="mt-4 space-y-3">
            <label className="block text-sm font-semibold">
              Nama tampilan
              <Input
                name="display_name"
                className="mt-2"
                required
                minLength={2}
                maxLength={80}
              />
            </label>
            <label className="block text-sm font-semibold">
              Email
              <Input name="email" type="email" className="mt-2" required />
            </label>
            <Button type="submit">Kirim undangan</Button>
          </form>
          {members.data?.length ? (
            <ul className="mt-4 divide-y divide-[#eadfce]">
              {members.data.map((member) => (
                <li key={member.user_id} className="flex justify-between py-3">
                  <span>
                    {(Array.isArray(member.profiles)
                      ? member.profiles[0]?.display_name
                      : (member.profiles as { display_name: string } | null)
                          ?.display_name) ?? "Relawan"}
                  </span>
                  <span className="text-sm text-[#4d6156] capitalize">
                    {member.role}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title="Belum ada anggota"
              body="Tambahkan akun dan keanggotaan melalui proses provisioning admin."
            />
          )}
        </section>
        <section className="surface p-5">
          <h2 className="font-heading text-xl">Tugaskan relawan</h2>
          {assessors.length && people.data?.length ? (
            <form action={assignAssessor} className="mt-4 space-y-4">
              <label className="block text-sm font-semibold">
                Peserta
                <div className="mt-2">
                  <Select
                    name="participant_id"
                    defaultValue={people.data[0].id}
                  >
                    <SelectButton>
                      <SelectValue placeholder="Pilih peserta" />
                    </SelectButton>
                    <SelectPopup>
                      {people.data.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.display_name}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
              </label>
              <label className="block text-sm font-semibold">
                Relawan
                <div className="mt-2">
                  <Select
                    name="assessor_id"
                    defaultValue={assessors[0].user_id}
                  >
                    <SelectButton>
                      <SelectValue placeholder="Pilih relawan" />
                    </SelectButton>
                    <SelectPopup>
                      {assessors.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {(Array.isArray(member.profiles)
                            ? member.profiles[0]?.display_name
                            : (
                                member.profiles as {
                                  display_name: string
                                } | null
                              )?.display_name) ?? member.user_id}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>
              </label>
              <Button type="submit">Simpan penugasan</Button>
            </form>
          ) : (
            <Empty
              title="Belum bisa menugaskan"
              body="Tambahkan peserta dan relawan terlebih dahulu."
            />
          )}
          <p className="mt-4 text-xs text-[#4d6156]">
            {assignments.data?.length ?? 0} penugasan aktif
          </p>
        </section>
      </div>
      <form
        action={updateRetention}
        className="surface mt-6 max-w-md space-y-3 p-5"
      >
        <h2 className="font-heading text-xl">Kebijakan retensi</h2>
        <p className="text-sm text-[#4d6156]">
          Periode rencana penyimpanan data. Penghapusan terjadwal memerlukan
          prosedur operasional.
        </p>
        <label className="block text-sm font-semibold">
          Bulan
          <Input
            type="number"
            name="retention_months"
            min="1"
            max="120"
            required
            defaultValue={organization.data?.retention_months ?? 36}
            className="mt-2"
          />
        </label>
        <Button type="submit">Simpan periode</Button>
      </form>
      <Button
        render={<Link href="/settings/quiz" />}
        variant="link"
        className="mt-6 mr-5"
      >
        Kelola kuis mandiri →
      </Button>
      <Button
        render={<Link href="/settings/instrument" />}
        variant="link"
        className="mt-6"
      >
        Lihat aturan instrumen →
      </Button>
    </Shell>
  )
}
