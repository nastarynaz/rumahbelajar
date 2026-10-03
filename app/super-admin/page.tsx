import Link from "next/link"
import { requireSuperAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { Shell } from "@/components/product/shell"
import { assignOrganizationAdmin, createOrganization } from "./actions"

export default async function SuperAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  await requireSuperAdmin()
  const query = await searchParams
  if (!process.env.SUPABASE_SECRET_KEY) return <Shell title="Kelola Rumah Belajar" eyebrow="Super admin" superAdmin><p role="alert" className="surface max-w-xl p-5 text-sm leading-6">Secret key Supabase belum tersedia di server. Isi `SUPABASE_SECRET_KEY` pada Environment Variables Vercel Production lalu deploy ulang.</p></Shell>
  const admin = createAdminClient()
  const [organizations, memberships] = await Promise.all([
    admin.from("organizations").select("id,name,created_at").order("created_at", { ascending: false }),
    admin.from("organization_members").select("organization_id,role").eq("role", "admin"),
  ])
  const issue = organizations.error ?? memberships.error
  const errorMessage = query.error === "notfound"
    ? "Email belum terdaftar di Supabase Authentication → Users. Buat akunnya lebih dulu."
    : query.error
      ? "Perubahan belum tersimpan. Periksa isian dan coba lagi."
      : null
  return <Shell title="Kelola Rumah Belajar" eyebrow="Super admin" superAdmin action={<Link href="/dashboard" className="action-secondary">Kembali ke dashboard</Link>}>
    <p className="mb-6 max-w-2xl text-sm leading-6 text-[#4d6156]">Atur organisasi dan adminnya. Data anak tetap berada di ruang organisasi masing-masing.</p>
    {errorMessage && <p role="alert" className="mb-5 rounded-xl border border-[#e8c9b8] bg-[#fff4ed] p-4 text-sm">{errorMessage}</p>}
    {query.success && <p role="status" className="mb-5 rounded-xl border border-[#bdd7c7] bg-[#edf6ef] p-4 text-sm">Perubahan berhasil disimpan.</p>}
    {issue && <p role="alert" className="mb-5 rounded-xl border border-[#e8c9b8] bg-[#fff4ed] p-4 text-sm">Data organisasi belum dapat dimuat ({issue.code}). Periksa migrasi dan konfigurasi Supabase.</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <form action={createOrganization} className="surface space-y-4 p-5">
        <div><h2 className="font-heading text-xl">Organisasi baru</h2><p className="mt-1 text-sm text-[#4d6156]">Buat ruang kerja baru untuk program atau cabang.</p></div>
        <label className="block text-sm font-semibold">Nama organisasi<input name="name" className="field mt-2" minLength={2} maxLength={120} required placeholder="Contoh: Rumah Belajar Cabang Utara" /></label>
        <button className="action">Buat organisasi</button>
      </form>
      <form action={assignOrganizationAdmin} className="surface space-y-4 p-5">
        <div><h2 className="font-heading text-xl">Tetapkan admin</h2><p className="mt-1 text-sm text-[#4d6156]">Akun harus sudah ada di Supabase Authentication → Users.</p></div>
        <label className="block text-sm font-semibold">Organisasi<select name="organization_id" className="field mt-2" required>{organizations.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="block text-sm font-semibold">Email akun<input name="email" type="email" className="field mt-2" required placeholder="admin@contoh.org" /></label>
        <button className="action" disabled={!organizations.data?.length}>Tetapkan admin</button>
      </form>
    </div>
    <section className="mt-8"><h2 className="mb-3 font-heading text-2xl">Organisasi</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{organizations.data?.map((item) => <div key={item.id} className="surface p-5"><h3 className="font-heading text-xl">{item.name}</h3><p className="mt-2 text-sm text-[#4d6156]">{memberships.data?.filter((member) => member.organization_id === item.id).length ?? 0} admin</p></div>)}</div></section>
  </Shell>
}
