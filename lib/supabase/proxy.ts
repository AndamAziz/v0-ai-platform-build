import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const isPublicRoute =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.startsWith("/_next/")

  // For public routes that don't need auth, just return early
  if (isPublicRoute && !request.nextUrl.pathname.startsWith("/auth")) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  let user = null
  let hasStaleSession = false

  try {
    const { data, error } = await supabase.auth.getUser()
    user = data?.user

    if (
      error &&
      (error.message.includes("session_not_found") ||
        error.message.includes("Session") ||
        error.message.includes("JWT") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("fetch") ||
        error.code === "session_not_found")
    ) {
      hasStaleSession = true
      user = null
    }
  } catch (error: any) {
    console.error("[v0] Auth error in middleware:", error)
    if (error?.message?.includes("Failed to fetch") || error?.message?.includes("fetch")) {
      // Network error - allow request to continue, page will handle auth state
      return supabaseResponse
    }
    hasStaleSession = true
  }

  if (hasStaleSession) {
    // Clear all Supabase auth cookies
    const cookieNames = request.cookies
      .getAll()
      .map((c) => c.name)
      .filter((name) => name.startsWith("sb-") || name.includes("supabase"))

    const response = NextResponse.redirect(new URL("/auth/login", request.url))
    cookieNames.forEach((name) => {
      response.cookies.delete(name)
    })

    return response
  }

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // Redirect logged in users from auth pages to dashboard
  if (request.nextUrl.pathname.startsWith("/auth") && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
