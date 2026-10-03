"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CopyLink({
  url,
  label = "Tautan untuk anak",
}: {
  url: string
  label?: string
}) {
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
  return (
    <div>
      <label className="block text-sm font-semibold">
        {label}
        <Input
          ref={input}
          nativeInput
          className="mt-2 font-normal"
          readOnly
          value={url}
          onFocus={(event) => event.target.select()}
        />
      </label>
      <Button type="button" variant="outline" className="mt-3" onClick={copy}>
        {copied ? "Tautan tersalin ✓" : "Salin tautan"}
      </Button>
    </div>
  )
}
