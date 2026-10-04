"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth"

const titleSchema = z.string().trim().min(2).max(120)
const questionSchema = z.object({
  section: z.string().trim().min(1).max(80),
  prompt: z.string().trim().min(2).max(500),
  answer_index: z.coerce.number().int().min(1).max(6),
})

function builderPath(id: string) { return `/settings/quiz/forms/${id}` }

export async function createQuiz(formData: FormData) {
  const title = titleSchema.safeParse(formData.get("title"))
  if (!title.success) redirect("/settings/quiz?error=title")
  const { supabase, membership } = await requireAdmin()
  const slug = randomBytes(12).toString("base64url")
  const { data, error } = await supabase.from("public_quizzes").insert({
    organization_id: membership.organization_id, slug, title: title.data,
    version: "kuis-numerasi-v1", is_open: false,
  }).select("id").single()
  if (error || !data) redirect("/settings/quiz?error=create")
  revalidatePath("/settings/quiz")
  redirect(builderPath(data.id))
}

export async function saveQuizTitle(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("quiz_id"))
  const title = titleSchema.safeParse(formData.get("title"))
  if (!id.success || !title.success) redirect("/settings/quiz?error=title")
  const { supabase, membership } = await requireAdmin()
  const { error } = await supabase.from("public_quizzes").update({ title: title.data })
    .eq("id", id.data).eq("organization_id", membership.organization_id)
  if (error) redirect(`${builderPath(id.data)}?error=title`)
  revalidatePath("/settings/quiz")
  revalidatePath(builderPath(id.data))
  redirect(`${builderPath(id.data)}?saved=title`)
}

export async function toggleQuizOpen(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("quiz_id"))
  if (!id.success) redirect("/settings/quiz?error=quiz")
  const isOpen = formData.get("is_open") === "true"
  const { supabase, membership } = await requireAdmin()
  if (isOpen) {
    const { count, error } = await supabase.from("public_quiz_items").select("id", { count: "exact", head: true })
      .eq("quiz_id", id.data).eq("organization_id", membership.organization_id)
    if (error || !count) redirect(`${builderPath(id.data)}?error=empty`)
  }
  const { error } = await supabase.from("public_quizzes").update({ is_open: isOpen })
    .eq("id", id.data).eq("organization_id", membership.organization_id)
  if (error) redirect(`${builderPath(id.data)}?error=quiz`)
  revalidatePath("/settings/quiz")
  revalidatePath(builderPath(id.data))
  redirect(`${builderPath(id.data)}?saved=status`)
}

export async function saveQuizItem(formData: FormData) {
  const quizId = z.uuid().safeParse(formData.get("quiz_id"))
  const itemId = formData.get("item_id") ? z.uuid().safeParse(formData.get("item_id")) : null
  if (!quizId.success || (itemId && !itemId.success)) redirect("/settings/quiz?error=question")
  const path = builderPath(quizId.data)
  const question = questionSchema.safeParse(Object.fromEntries(formData))
  const choices = Array.from({ length: 6 }, (_, index) => String(formData.get(`option_${index + 1}`) ?? "").trim())
  const options = choices.filter(Boolean)
  if (!question.success || options.length < 2 || options.some((choice) => choice.length > 80)
    || new Set(options).size !== options.length || !choices[question.data.answer_index - 1]) {
    redirect(`${path}?error=question`)
  }
  const { supabase, membership } = await requireAdmin()
  const { data: quiz, error: quizError } = await supabase.from("public_quizzes").select("id,is_open")
    .eq("id", quizId.data).eq("organization_id", membership.organization_id).maybeSingle()
  if (quizError || !quiz) redirect("/settings/quiz?error=quiz")
  if (quiz.is_open) redirect(`${path}?error=close`)
  const values = {
    section: question.data.section, prompt: question.data.prompt, options,
    answer: choices[question.data.answer_index - 1], is_required: true,
  }
  if (itemId?.success) {
    const { error } = await supabase.from("public_quiz_items").update({ ...values, ...(formData.get("keep_visual") === "on" ? {} : { visual: null }) })
      .eq("id", itemId.data).eq("quiz_id", quizId.data).eq("organization_id", membership.organization_id)
    if (error) redirect(`${path}?error=question`)
  } else {
    const { data: last, error: lastError } = await supabase.from("public_quiz_items").select("sort_order")
      .eq("quiz_id", quizId.data).order("sort_order", { ascending: false }).limit(1).maybeSingle()
    if (lastError) redirect(`${path}?error=question`)
    const { error } = await supabase.from("public_quiz_items").insert({
      ...values, quiz_id: quizId.data, organization_id: membership.organization_id,
      code: `q-${randomBytes(8).toString("hex")}`, sort_order: (last?.sort_order ?? 0) + 1,
    })
    if (error) redirect(`${path}?error=question`)
  }
  revalidatePath(path)
  redirect(`${path}?saved=question`)
}

export async function deleteQuizItem(formData: FormData) {
  const quizId = z.uuid().safeParse(formData.get("quiz_id"))
  const itemId = z.uuid().safeParse(formData.get("item_id"))
  if (!quizId.success || !itemId.success) redirect("/settings/quiz?error=question")
  const path = builderPath(quizId.data)
  const { supabase, membership } = await requireAdmin()
  const [{ data: quiz }, { count }] = await Promise.all([
    supabase.from("public_quizzes").select("is_open").eq("id", quizId.data).eq("organization_id", membership.organization_id).maybeSingle(),
    supabase.from("public_quiz_items").select("id", { count: "exact", head: true }).eq("quiz_id", quizId.data),
  ])
  if (!quiz || quiz.is_open || !count || count <= 1) redirect(`${path}?error=delete`)
  const { error } = await supabase.from("public_quiz_items").delete()
    .eq("id", itemId.data).eq("quiz_id", quizId.data).eq("organization_id", membership.organization_id)
  if (error) redirect(`${path}?error=delete`)
  revalidatePath(path)
  redirect(`${path}?saved=delete`)
}
