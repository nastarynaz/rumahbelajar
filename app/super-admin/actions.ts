"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { requireSuperAdmin } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function createOrganization(formData: FormData) {
  const name = z.string().trim().min(2).max(120).safeParse(formData.get("name"))
  if (!name.success) redirect("/super-admin?error=organization")
  await requireSuperAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from("organizations").insert({ name: name.data })
  if (error) redirect("/super-admin?error=organization")
  revalidatePath("/super-admin")
  redirect("/super-admin?success=organization")
}

export async function assignOrganizationAdmin(formData: FormData) {
  const input = z.object({ organization_id: z.uuid(), email: z.email() }).safeParse(Object.fromEntries(formData))
  if (!input.success) redirect("/super-admin?error=member")
  await requireSuperAdmin()
  const admin = createAdminClient()
  const { data: organization } = await admin.from("organizations").select("id").eq("id", input.data.organization_id).maybeSingle()
  if (!organization) redirect("/super-admin?error=member")

  let userId: string | undefined
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error || !data) redirect("/super-admin?error=member")
    userId = data.users.find((user) => user.email?.toLowerCase() === input.data.email.toLowerCase())?.id
    if (data.users.length < 100) break
  }
  if (!userId) redirect("/super-admin?error=notfound")

  const { error } = await admin.from("organization_members").upsert({
    organization_id: organization.id, user_id: userId, role: "admin",
  }, { onConflict: "organization_id,user_id" })
  if (error) redirect("/super-admin?error=member")
  revalidatePath("/super-admin")
  redirect("/super-admin?success=member")
}
