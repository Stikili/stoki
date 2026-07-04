'use server'

import { randomBytes } from 'crypto'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Founder-only "beta invite" — creates a Supabase auth user with a
 * temporary password AND pre-confirms their email in one shot, so the
 * invitee can sign in immediately without any confirmation email.
 *
 * Solves the SMTP dependency problem for beta onboarding: while
 * Resend / custom SMTP is being set up, the founder can still add
 * trusted testers by hand and hand them the temp password over
 * WhatsApp / in person.
 *
 * Returns the temp password to the caller ONE TIME — it's bcrypt-hashed
 * inside Supabase and can never be retrieved again. The admin UI shows
 * it once, with copy-to-clipboard, and stresses that it must be
 * captured now.
 *
 * The invitee is expected to change their password from
 * /settings/account on first login. That path already exists.
 */
export type BetaInviteResult =
  | { ok: true; email: string; tempPassword: string; userId: string }
  | { ok: false; error: string }

export async function createBetaInvite(rawEmail: string): Promise<BetaInviteResult> {
  const admin = await requireAdmin()
  const email = rawEmail.trim().toLowerCase()

  if (!email || !email.includes('@') || email.length > 320) {
    return { ok: false, error: 'Enter a valid email address.' }
  }

  const sb = createAdminClient()

  // Refuse if the email is already registered. Two policy reasons:
  //   1) prevents accidental double-clicks from creating dupes
  //   2) forces the admin to think about it — an existing user should
  //      be manually confirmed via dashboard, not re-created
  const { data: lookup } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = lookup?.users?.find(u => u.email?.toLowerCase() === email)
  if (existing) {
    return {
      ok: false,
      error: `Already registered (${existing.email_confirmed_at ? 'confirmed' : 'unconfirmed'}). Confirm via Supabase dashboard instead.`,
    }
  }

  // Generate a 12-char base64url password. 9 random bytes → 12 base64url
  // characters ~= 72 bits of entropy, plenty for a temp password the
  // user rotates immediately. Base64url avoids ambiguous chars (I / l /
  // 1 / O / 0 aren't distinguished, but base64url keeps this readable
  // over WhatsApp / voice).
  const tempPassword = randomBytes(9).toString('base64url')

  const { data: created, error: createError } = await sb.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      beta_invited_by: admin.email,
      beta_invited_at: new Date().toISOString(),
    },
  })

  if (createError || !created?.user) {
    return { ok: false, error: createError?.message ?? 'Failed to create user.' }
  }

  // Server log so we have an audit trail of who invited whom.
  // (Sentry will pick this up as a breadcrumb if the request errors.)
  console.log(`[admin] beta invite created`, {
    email,
    invitedBy: admin.email,
    userId: created.user.id,
  })

  // Refresh the /admin page so the new signup shows up in the table.
  revalidatePath('/admin')

  return {
    ok: true,
    email,
    tempPassword,
    userId: created.user.id,
  }
}
