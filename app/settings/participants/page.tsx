import { requireAdmin } from "@/lib/auth"
import { Shell } from "@/components/product/shell"
import { addParticipant } from "@/app/settings/actions"

export default async function AddParticipantPage() {
  const { supabase, membership } = await requireAdmin()
  const { data: members } = await supabase.from("organization_members").select("user_id,profiles(display_name)").eq("organization_id", membership.organization_id).eq("role", "assessor")
  return <Shell title="Tambah peserta" eyebrow="Data minimal" admin><form action={addParticipant} className="surface max-w-xl space-y-5 p-6"><p className="text-sm leading-6 text-[#4d6156]">Gunakan nama tampilan atau kode. Jangan menuliskan riwayat keluarga atau informasi sensitif.</p><label className="block font-semibold">Nama tampilan<input name="display_name" className="field mt-2" required maxLength={80} /></label><label className="block font-semibold">Kode, opsional<input name="code" className="field mt-2" maxLength={40} /></label><label className="block font-semibold">Level mulai default<select name="start_level" className="field mt-2">{["A","B","C","D1","D2","E","F"].map((code) => <option key={code}>{code}</option>)}</select></label><label className="block font-semibold">Tugaskan relawan, opsional<select name="assessor_id" className="field mt-2"><option value="">Belum ditugaskan</option>{members?.map((member) => <option key={member.user_id} value={member.user_id}>{(Array.isArray(member.profiles) ? member.profiles[0]?.display_name : (member.profiles as {display_name: string} | null)?.display_name) ?? member.user_id}</option>)}</select></label><button className="action">Simpan peserta</button></form></Shell>
}
