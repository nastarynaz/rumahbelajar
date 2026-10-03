import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const publicPath = request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/auth/") || request.nextUrl.pathname.startsWith("/quiz/")
  if (publicPath) return response
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return response
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(items) {
        items.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = "/login"
    redirect.search = ""
    return NextResponse.redirect(redirect)
  }
  return response
}
