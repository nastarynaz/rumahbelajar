import { requireAdmin } from "@/lib/auth"
import { Shell } from "@/components/product/shell"
import { addParticipant } from "@/app/settings/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectButton,
  SelectItem,
  SelectPopup,
  SelectValue,
} from "@/components/ui/select"

export default async function AddParticipantPage() {
  const { supabase, membership } = await requireAdmin()
  const { data: members } = await supabase
    .from("organization_members")
    .select("user_id,profiles(display_name)")
    .eq("organization_id", membership.organization_id)
    .eq("role", "assessor")
  return (
    <Shell title="Tambah peserta" eyebrow="Data minimal" admin>
      <form action={addParticipant} className="surface max-w-xl space-y-5 p-6">
        <p className="text-sm leading-6 text-[#4d6156]">
          Gunakan nama tampilan atau kode. Jangan menuliskan riwayat keluarga
          atau informasi sensitif.
        </p>
        <label className="block font-semibold">
          Nama tampilan
          <Input name="display_name" className="mt-2" required maxLength={80} />
        </label>
        <label className="block font-semibold">
          Kode, opsional
          <Input name="code" className="mt-2" maxLength={40} />
        </label>
        <label className="block font-semibold">
          Level mulai default
          <div className="mt-2">
            <Select name="start_level" defaultValue="A">
              <SelectButton>
                <SelectValue />
              </SelectButton>
              <SelectPopup>
                {["A", "B", "C", "D1", "D2", "E", "F"].map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </label>
        <label className="block font-semibold">
          Tugaskan relawan, opsional
          <div className="mt-2">
            <Select name="assessor_id" defaultValue="">
              <SelectButton>
                <SelectValue placeholder="Belum ditugaskan" />
              </SelectButton>
              <SelectPopup>
                <SelectItem value="">Belum ditugaskan</SelectItem>
                {members?.map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {(Array.isArray(member.profiles)
                      ? member.profiles[0]?.display_name
                      : (member.profiles as { display_name: string } | null)
                          ?.display_name) ?? member.user_id}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>
        </label>
        <Button type="submit">Simpan peserta</Button>
      </form>
    </Shell>
  )
}
