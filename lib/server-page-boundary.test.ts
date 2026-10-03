import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vitest"

function pages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? pages(path) : entry.name === "page.tsx" ? [path] : []
  })
}

test("server pages do not send browser event handlers across the server boundary", () => {
  const offenders = pages(join(process.cwd(), "app")).filter((path) => {
    const source = readFileSync(path, "utf8")
    return !/^\s*["']use client["']/.test(source) && /\bon[A-Z][A-Za-z]+\s*=\s*\{/.test(source)
  })
  expect(offenders).toEqual([])
})
