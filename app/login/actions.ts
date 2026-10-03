"use server"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export async function signInWithPassword(formData: FormData) {
  const input = z.object({ email: z.email(), password: z.string().min(1).max(256) }).safeParse(Object.fromEntries(formData))
  if (!input.success) redirect("/login?error=credentials")
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(input.data)
  if (error) redirect("/login?error=credentials")
  redirect("/dashboard")
}

export async function sendMagicLink(formData: FormData) {
  const email = z.email().safeParse(formData.get("email"))
  if (!email.success) redirect("/login?error=email")
  const supabase = await createClient()
  const headerStore = await headers()
  const origin = headerStore.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL
  if (!origin) throw new Error("Alamat situs belum dikonfigurasi.")
  const { error } = await supabase.auth.signInWithOtp({ email: email.data, options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm` } })
  if (error) redirect("/login?error=kirim")
  redirect("/login?sent=1")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
