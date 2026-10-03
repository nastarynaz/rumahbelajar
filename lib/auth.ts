import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function requireUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) redirect("/login")
  const user = { id: claims.sub }
  const { data: memberships, error } = await supabase.from("organization_members").select("organization_id,role,organizations(name)").eq("user_id", user.id)
  if (error) throw new Error("Akses tim tidak dapat dimuat.")
  if (!memberships?.length) {
    const { data: platformAdmin } = await supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle()
    if (platformAdmin) redirect("/super-admin")
    redirect("/access-denied")
  }
  const membership = memberships[0]
  return { supabase, user, membership, memberships }
}

export async function requireAdmin() {
  const context = await requireUser()
  if (context.membership.role !== "admin") redirect("/access-denied")
  return context
}

export async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  const userId = auth?.claims.sub
  if (!userId) redirect("/login")
  const { data, error } = await supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle()
  if (error || !data) redirect("/access-denied")
  return { supabase, user: { id: userId } }
}
