import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'

/**
 * /admin gate. The page is hidden behind:
 *   1. Authenticated session (else → /login)
 *   2. Email allowlist from ADMIN_EMAILS env (comma-separated)
 *      else → notFound() so the route doesn't even reveal it exists to
 *      curious logged-in users.
 *
 * ADMIN_EMAILS is server-only (NOT NEXT_PUBLIC_*) — never reaches the
 * client. Set it in Vercel project envs as `ADMIN_EMAILS=a@x.com,b@y.com`.
 * On Vercel preview deploys you can scope it tighter or leave it unset to
 * make /admin unreachable in preview.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const email = (user.email ?? '').toLowerCase()
  const allow = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  if (!email || !allow.includes(email)) notFound()

  return { id: user.id, email }
}
