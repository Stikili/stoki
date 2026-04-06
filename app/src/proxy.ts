import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not add logic between createServerClient and getUser
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users to login
  if (!user && pathname.startsWith('/dashboard') ||
      !user && pathname.startsWith('/inventory') ||
      !user && pathname.startsWith('/sales') ||
      !user && pathname.startsWith('/credit') ||
      !user && pathname.startsWith('/advisor') ||
      !user && pathname.startsWith('/alerts') ||
      !user && pathname.startsWith('/onboarding') ||
      !user && pathname.startsWith('/stores') ||
      !user && pathname.startsWith('/settings') ||
      !user && pathname.startsWith('/expenses') ||
      !user && pathname.startsWith('/cashup') ||
      !user && pathname.startsWith('/pricelist') ||
      !user && pathname.startsWith('/customers')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Always allow the reset-password page (user has a recovery session)
  if (pathname.startsWith('/auth/reset-password')) {
    return supabaseResponse
  }

  // Redirect authenticated users away from login
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
