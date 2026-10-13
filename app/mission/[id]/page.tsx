import { notFound } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { levels, type LevelCode } from "@/lib/instrument"
import { missionForLevel } from "@/lib/mission"
import { MissionRunner } from "@/components/product/mission-runner"

export default async function MissionPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ level?: string }>
}) {
  const { id } = await params
  const { level: requestedLevel } = await searchParams
  const { supabase, membership } = await requireUser()
  const { data: person } = await supabase.from("participants")
    .select("id,display_name,start_level").eq("id", id)
    .eq("organization_id", membership.organization_id).is("archived_at", null).single()
  if (!person) notFound()
  const { data: latest } = await supabase.from("assessment_sessions")
    .select("highest_passed_level").eq("participant_id", id)
    .eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle()
  const lastIndex = levels.findIndex((item) => item.code === latest?.highest_passed_level)
  const recommended = lastIndex < 0 ? person.start_level : levels[Math.min(lastIndex + 1, levels.length - 1)].code
  const code = levels.some((item) => item.code === requestedLevel) ? requestedLevel as LevelCode : recommended as LevelCode
  const questions = missionForLevel(code).map((question) => ({
    id: question.id, prompt: question.prompt, options: question.options, phase: question.phase,
  }))
  return <MissionRunner participantId={id} level={code} questions={questions} />
}
