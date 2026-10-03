"use client"

import { useRef, useState } from "react"

export function CopyLink({ url, label = "Tautan untuk anak" }: { url: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  async function copy() {
    input.current?.select()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return <div><label className="block text-sm font-semibold">{label}<input ref={input} className="field mt-2 font-normal" readOnly value={url} onFocus={(event) => event.target.select()} /></label><button type="button" onClick={copy} className="action-secondary mt-3">{copied ? "Tautan tersalin ✓" : "Salin tautan"}</button></div>
}
