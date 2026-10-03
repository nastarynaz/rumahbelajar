import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  const token_hash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type")
  if (token_hash && type === "magiclink") {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: "magiclink" })
    if (!error) return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  return NextResponse.redirect(new URL("/login?error=tautan", request.url))
}
