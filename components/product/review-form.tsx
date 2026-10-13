"use client"
import Link from "next/link"
import { useState } from "react"
import { finalizeAssessment, saveObservation } from "@/app/assessments/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/ui/native-select"

export function ReviewForm({
  id,
  revision,
  observation,
}: {
  id: string
  revision: number
  observation: {
    counting_method: string | null
    explanation: string | null
    difficulty_response: string | null
    tools: string[]
    motivator: string | null
    note: string | null
    day1_metrics?: {
      engagement?: { opener?: number | null; desk?: number | null; game?: number | null; tablet?: number | null }
      focus_minutes?: number | null
      comfort?: string
      peer_help?: string
      tablet_use?: string
    } | null
  } | null
}) {
  const [counting, setCounting] = useState(observation?.counting_method ?? "")
  const [explanation, setExplanation] = useState(observation?.explanation ?? "")
  const [difficulty, setDifficulty] = useState(
    observation?.difficulty_response ?? ""
  )
  const [tools, setTools] = useState(observation?.tools ?? [])
  const [motivator, setMotivator] = useState(observation?.motivator ?? "")
  const [note, setNote] = useState(observation?.note ?? "")
  const [engagement, setEngagement] = useState({
    opener: observation?.day1_metrics?.engagement?.opener ?? null,
    desk: observation?.day1_metrics?.engagement?.desk ?? null,
    game: observation?.day1_metrics?.engagement?.game ?? null,
    tablet: observation?.day1_metrics?.engagement?.tablet ?? null,
  })
  const [focusMinutes, setFocusMinutes] = useState<string>(String(observation?.day1_metrics?.focus_minutes ?? ""))
  const [comfort, setComfort] = useState(observation?.day1_metrics?.comfort ?? "")
  const [peerHelp, setPeerHelp] = useState(observation?.day1_metrics?.peer_help ?? "")
  const [tabletUse, setTabletUse] = useState(observation?.day1_metrics?.tablet_use ?? "")
  const [state, setState] = useState("")
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState("")
  async function save() {
    setBusy(true)
    setState("Menyimpan catatan...")
    try {
      await saveObservation(id, {
        counting_method: counting || null,
        explanation: explanation || null,
        difficulty_response: difficulty || null,
        tools,
        motivator,
        note,
        day1_metrics: {
          engagement,
          focus_minutes: focusMinutes === "" ? null : Number(focusMinutes),
          comfort,
          peer_help: peerHelp,
          tablet_use: tabletUse,
        },
      })
      setState("Catatan tersimpan")
    } catch (error) {
      setState(
        error instanceof Error ? error.message : "Catatan belum tersimpan"
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <aside className="space-y-5">
      <div className="surface p-5">
        <h2 className="font-heading text-xl">Catatan pengamatan</h2>
        <p className="mt-2 text-xs leading-5 text-[#4d6156]">
          Tulis yang terlihat, bukan label. Contoh: “menghitung satu-satu dengan
          jari”, bukan “lambat”.
        </p>
        <div className="mt-4 space-y-3">
          <Select
            label="Cara menghitung"
            value={counting}
            set={setCounting}
            options={[
              "hitung dari 1",
              "lanjut dari angka besar",
              "langsung tahu",
              "bersusun",
              "menebak",
              "lainnya",
            ]}
          />
          <Select
            label="Menjelaskan cara"
            value={explanation}
            set={setExplanation}
            options={["bisa", "sebagian", "belum", "tidak ditanyakan"]}
          />
          <Select
            label="Saat sulit"
            value={difficulty}
            set={setDifficulty}
            options={[
              "mencoba lagi",
              "meminta bantuan",
              "diam",
              "menghindar",
              "marah/sedih",
              "lainnya",
            ]}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Alat bantu</legend>
            <div className="flex flex-wrap gap-2">
              {[
                "jari",
                "benda konkret",
                "gambar/titik",
                "coretan",
                "prompt verbal",
              ].map((item) => (
                <label
                  key={item}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#b7c7bf] px-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={tools.includes(item)}
                    onChange={(event) =>
                      setTools((previous) =>
                        event.target.checked
                          ? [...previous, item]
                          : previous.filter((value) => value !== item)
                      )
                    }
                  />
                  {item}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-semibold">
            Minat yang terlihat
            <Input
              className="mt-2"
              maxLength={300}
              value={motivator}
              onChange={(event) => setMotivator(event.target.value)}
            />
          </label>
          <label className="block text-sm font-semibold">
            Catatan singkat
            <Textarea
              className="mt-2 min-h-24"
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <fieldset className="space-y-3 rounded-xl bg-[#f2f7f3] p-4">
            <legend className="font-semibold">Semangat per kegiatan</legend>
            <p className="text-xs text-[#4d6156]">1 = kurang tertarik, 2 = biasa, 3 = antusias. Kosongkan bila tidak diamati.</p>
            {([
              ["opener", "Kakak Bilang"], ["desk", "Meja Belajar"], ["game", "Permainan"], ["tablet", "Tablet"],
            ] as const).map(([key, label]) => <label key={key} className="block text-sm font-semibold">{label}
              <NativeSelect className="mt-1" value={engagement[key] ?? ""} onChange={(event) => setEngagement((previous) => ({ ...previous, [key]: event.target.value ? Number(event.target.value) : null }))}>
                <option value="">Belum diamati</option><option value="1">1 · kurang tertarik</option><option value="2">2 · biasa</option><option value="3">3 · antusias</option>
              </NativeSelect>
            </label>)}
          </fieldset>
          <label className="block text-sm font-semibold">Lama fokus di Meja Belajar (menit)
            <Input className="mt-2" type="number" min={0} max={90} value={focusMinutes} onChange={(event) => setFocusMinutes(event.target.value)} />
          </label>
          <Select label="Bisa atau belum nyaman?" value={comfort} set={setComfort} options={["bisa dan nyaman", "bisa saat berdua", "bisa dengan benda", "belum paham meski dibantu", "belum dapat disimpulkan"]} />
          <Select label="Saat membantu teman" value={peerHelp} set={setPeerHelp} options={["memberi petunjuk", "langsung memberi jawaban", "belum diamati"]} />
          <Select label="Di tablet" value={tabletUse} set={setTabletUse} options={["memilih sendiri", "memakai audio", "minta dibacakan", "dibantu memilih", "belum diamati"]} />
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={save}
          >
            Simpan catatan
          </Button>
          <p role="status" className="text-sm">
            {state}
          </p>
        </div>
      </div>
      <form
        action={finalizeAssessment.bind(null, id)}
        className="surface space-y-4 p-5"
      >
        <h2 className="font-heading text-xl">Akhiri sesi</h2>
        <p className="text-sm text-[#4d6156]">
          Tawarkan satu soal mudah sebagai penutup positif sebelum
          menyelesaikan. Penutup tidak mengubah hasil.
        </p>
        <input name="revision" type="hidden" value={revision} />
        <label className="block text-sm font-semibold">
          Alasan berhenti
          <NativeSelect
            name="stop_reason"
            required
            className="mt-2"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          >
            <option value="" disabled>
              Pilih alasan
            </option>
            <option value="level_not_met">
              Kriteria level belum terpenuhi
            </option>
            <option value="child_declined">Anak memilih berhenti</option>
            <option value="all_levels_passed">Semua level dicoba</option>
            <option value="time_limit">Waktu pertemuan selesai</option>
            <option value="assessor_decision">Keputusan relawan</option>
          </NativeSelect>
        </label>
        {reason === "assessor_decision" && (
          <label className="block text-sm font-semibold">
            Alasan keputusan relawan
            <Textarea
              name="override_reason"
              required
              minLength={5}
              maxLength={1000}
              className="mt-2 min-h-20"
            />
          </label>
        )}
        <label className="block text-sm font-semibold">
          Fokus pertemuan berikutnya
          <Textarea
            name="summary_note"
            maxLength={2000}
            className="mt-2 min-h-20"
          />
        </label>
        <Button type="submit" className="w-full">
          Finalisasi sesi
        </Button>
        <Button
          render={<Link href={`/assessments/${id}/run`} />}
          variant="outline"
          className="w-full"
        >
          Koreksi jawaban
        </Button>
      </form>
    </aside>
  )
}
function Select({
  label,
  value,
  set,
  options,
}: {
  label: string
  value: string
  set: (value: string) => void
  options: string[]
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <NativeSelect
        className="mt-2"
        value={value}
        onChange={(event) => set(event.target.value)}
      >
        <option value="">Belum dicatat</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </NativeSelect>
    </label>
  )
}
