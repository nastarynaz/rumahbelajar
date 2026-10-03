"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth"

export async function addParticipant(formData: FormData) {
  const input = z.object({ display_name: z.string().trim().min(1).max(80), code: z.string().trim().max(40), start_level: z.enum(["A","B","C","D1","D2","E","F"]), assessor_id: z.uuid().optional().or(z.literal("")) }).parse(Object.fromEntries(formData))
  const { supabase, membership } = await requireAdmin()
  const { data, error } = await supabase.from("participants").insert({ organization_id: membership.organization_id, display_name: input.display_name, code: input.code || null, start_level: input.start_level }).select("id").single()
  if (error || !data) throw new Error("Peserta belum dapat ditambahkan.")
  if (input.assessor_id) {
    const { error: assignmentError } = await supabase.from("assessor_assignments").insert({ organization_id: membership.organization_id, participant_id: data.id, assessor_id: input.assessor_id })
    if (assignmentError) throw new Error("Peserta ditambahkan, tetapi penugasan belum berhasil.")
  }
  revalidatePath("/participants")
  revalidatePath("/dashboard")
}

export async function assignAssessor(formData: FormData) {
  const input = z.object({ participant_id: z.uuid(), assessor_id: z.uuid() }).parse(Object.fromEntries(formData))
  const { supabase, membership } = await requireAdmin()
  const { data: person } = await supabase.from("participants").select("id").eq("organization_id", membership.organization_id).eq("id", input.participant_id).single()
  const { data: member } = await supabase.from("organization_members").select("user_id").eq("organization_id", membership.organization_id).eq("user_id", input.assessor_id).eq("role", "assessor").single()
  if (!person || !member) throw new Error("Peserta atau relawan tidak tersedia.")
  const { error } = await supabase.from("assessor_assignments").upsert({ organization_id: membership.organization_id, participant_id: person.id, assessor_id: member.user_id }, { onConflict: "participant_id,assessor_id" })
  if (error) throw new Error("Penugasan gagal disimpan.")
  revalidatePath("/settings/team")
}

export async function updateRetention(formData: FormData) {
  const months = z.coerce.number().int().min(1).max(120).parse(formData.get("retention_months"))
  const { supabase, membership } = await requireAdmin()
  const { error } = await supabase.from("organizations").update({ retention_months: months }).eq("id", membership.organization_id)
  if (error) throw new Error("Kebijakan retensi belum tersimpan.")
  revalidatePath("/settings/team")
}

export async function inviteAssessor(formData: FormData) {
  const email = z.email().parse(formData.get("email"))
  const displayName = z.string().trim().min(2).max(80).parse(formData.get("display_name"))
  const { supabase, membership } = await requireAdmin()
  const { createAdminClient } = await import("@/lib/supabase/admin")
  const admin = createAdminClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!siteUrl) throw new Error("URL situs belum dikonfigurasi.")
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { data: { display_name: displayName }, redirectTo: `${siteUrl}/auth/confirm` })
  if (error || !data.user) throw new Error("Undangan gagal dikirim. Periksa email dan coba lagi.")
  const { error: memberError } = await supabase.from("organization_members").upsert({ organization_id: membership.organization_id, user_id: data.user.id, role: "assessor" }, { onConflict: "organization_id,user_id" })
  if (memberError) throw new Error("Undangan terkirim, tetapi keanggotaan belum tersimpan. Hubungi admin sistem.")
  revalidatePath("/settings/team")
}

export async function linkQuizAttempt(formData: FormData) {
  const input = z.object({ attempt_id: z.uuid(), participant_id: z.union([z.uuid(), z.literal("")]) }).parse(Object.fromEntries(formData))
  const { supabase, membership } = await requireAdmin()
  if (input.participant_id) {
    const { data: participant } = await supabase.from("participants").select("id").eq("id", input.participant_id).eq("organization_id", membership.organization_id).is("archived_at", null).single()
    if (!participant) throw new Error("Peserta tidak tersedia.")
  }
  const { error } = await supabase.from("public_quiz_attempts").update({ participant_id: input.participant_id || null }).eq("id", input.attempt_id).eq("organization_id", membership.organization_id)
  if (error) throw new Error("Tautan peserta belum tersimpan.")
  revalidatePath(`/settings/quiz/${input.attempt_id}`)
  revalidatePath("/participants")
}
