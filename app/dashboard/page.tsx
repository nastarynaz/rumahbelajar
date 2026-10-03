import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { Shell, Empty } from "@/components/product/shell"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const { supabase, membership, user } = await requireUser()
  const [participants, sessions, pendingCount, platformAdmin] =
    await Promise.all([
      supabase
        .from("participants")
        .select("id,display_name,code", { count: "exact" })
        .eq("organization_id", membership.organization_id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("assessment_sessions")
        .select(
          "id,participant_id,status,type,assessed_on,participants(display_name)",
          { count: "exact" }
        )
        .eq("organization_id", membership.organization_id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("assessment_sessions")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)
        .in("status", ["draft", "in_progress"]),
      supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ])
  if (participants.error || sessions.error || pendingCount.error)
    throw new Error("Dashboard belum dapat dimuat.")
  const active =
    sessions.data?.filter(
      (session) =>
        session.status === "draft" || session.status === "in_progress"
    ) ?? []
  return (
    <Shell
      title="Siap untuk pertemuan hari ini"
      eyebrow="Ruang relawan"
      admin={membership.role === "admin"}
      superAdmin={Boolean(platformAdmin.data)}
      action={
        <Button render={<Link href="/assessments/new" />} variant="default">
          Mulai asesmen
        </Button>
      }
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="surface p-5">
          <p className="text-sm text-[#4d6156]">Peserta yang dapat diakses</p>
          <p className="mt-2 font-heading text-4xl">
            {participants.count ?? 0}
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-[#4d6156]">Sesi untuk dilanjutkan</p>
          <p className="mt-2 font-heading text-4xl">
            {pendingCount.count ?? 0}
          </p>
        </div>
        <div className="surface p-5">
          <p className="text-sm text-[#4d6156]">Sesi terbaru</p>
          <p className="mt-2 font-heading text-4xl">{sessions.count ?? 0}</p>
        </div>
      </section>
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-heading text-2xl">Lanjutkan sesi</h2>
          {active.length ? (
            <div className="surface divide-y divide-[#eadfce]">
              {active.map((session) => (
                <Link
                  key={session.id}
                  href={`/assessments/${session.id}/run`}
                  className="flex min-h-16 items-center justify-between gap-3 p-4 hover:bg-[#f9f6f1]"
                >
                  <span>
                    <strong className="block">
                      {Array.isArray(session.participants)
                        ? session.participants[0]?.display_name
                        : (
                            session.participants as {
                              display_name: string
                            } | null
                          )?.display_name}
                    </strong>
                    <small className="text-[#4d6156]">
                      {session.type} · {session.assessed_on}
                    </small>
                  </span>
                  <span className="text-sm font-semibold text-[#2e5a4c]">
                    Lanjutkan →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Semua sesi sudah tertangani"
              body="Sesi yang belum selesai akan muncul di sini."
            />
          )}
        </section>
        <section>
          <h2 className="mb-3 font-heading text-2xl">Peserta terbaru</h2>
          {participants.data?.length ? (
            <div className="surface divide-y divide-[#eadfce]">
              {participants.data.map((participant) => (
                <Link
                  key={participant.id}
                  href={`/participants/${participant.id}`}
                  className="flex min-h-16 items-center justify-between p-4 hover:bg-[#f9f6f1]"
                >
                  <span>{participant.display_name}</span>
                  <span className="text-sm font-semibold text-[#2e5a4c]">
                    Lihat →
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Belum ada peserta"
              body="Admin dapat menambahkan peserta, lalu menugaskan relawan untuk memulai asesmen."
            />
          )}
        </section>
      </div>
      {membership.role === "admin" && (
        <section className="surface mt-7 p-5">
          <h2 className="font-heading text-xl">Kelola program</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              render={<Link href="/settings/participants" />}
              variant="outline"
            >
              Tambah peserta
            </Button>
            <Button render={<Link href="/settings/team" />} variant="outline">
              Tim dan penugasan
            </Button>
            <Button render={<Link href="/settings/quiz" />} variant="outline">
              Posttest mandiri
            </Button>
            {platformAdmin.data && (
              <Button render={<Link href="/super-admin" />} variant="outline">
                Kelola platform
              </Button>
            )}
          </div>
        </section>
      )}
    </Shell>
  )
}
