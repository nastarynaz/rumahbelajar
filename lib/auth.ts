import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: memberships, error } = await supabase.from("organization_members").select("organization_id,role,organizations(name)").eq("user_id", user.id)
  if (error) throw new Error("Akses tim tidak dapat dimuat.")
  if (!memberships?.length) redirect("/access-denied")
  const membership = memberships[0]
  return { supabase, user, membership, memberships }
}

export async function requireAdmin() {
  const context = await requireUser()
  if (context.membership.role !== "admin") redirect("/access-denied")
  return context
}
