'use server'

import { randomBytes } from 'crypto'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { revalidatePath } from 'next/cache'
import { log } from '@/lib/log'

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

/**
 * Founder-only "delete user" — nukes an auth.users row + cascades to
 * every store the user owns (via ON DELETE CASCADE on stores.owner_id).
 *
 * Reserved for burning test accounts and cleaning up spam / abandoned
 * signups. Do NOT use to service POPIA delete requests from real users
 * — those go through the user-initiated /api/account/delete route which
 * preserves an audit trail. This is a founder utility, not a support
 * workflow.
 *
 * Guardrails:
 *   - requireAdmin() gates on our admin allowlist
 *   - Refuses to delete YOUR OWN admin account (can't nuke yourself)
 *   - Logs the deletion with admin.email attribution so the audit
 *     trail lives even after the target user is gone
 */
export type AdminActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string }

export async function deleteUserAsAdmin(userId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin()
  if (!userId || typeof userId !== 'string') {
    return { ok: false, error: 'Invalid user id.' }
  }
  if (userId === admin.id) {
    return { ok: false, error: "You can't delete your own admin account here — use Supabase dashboard if you really want to." }
  }

  const sb = createAdminClient()

  const { data: target } = await sb.auth.admin.getUserById(userId)
  const targetEmail = target?.user?.email ?? null

  const { error } = await sb.auth.admin.deleteUser(userId)
  if (error) {
    log.error('admin.delete_user.failed', { adminEmail: admin.email, userId, error: error.message })
    return { ok: false, error: error.message }
  }

  log.info('admin.delete_user.success', {
    adminEmail: admin.email,
    deletedUserId: userId,
    deletedUserEmail: targetEmail,
  })
  revalidatePath('/admin')
  return { ok: true, message: `Deleted ${targetEmail ?? userId}.` }
}

/**
 * Founder-only "send password reset" — fires Supabase's magic-link
 * reset email to a user. Useful when a beta tester loses their temp
 * password or a support conversation ends with "just reset mine".
 *
 * Same underlying flow as the /login "Forgot password?" button.
 * Requires Supabase Auth email templates enabled + SMTP configured.
 */
export async function sendPasswordResetAsAdmin(email: string): Promise<AdminActionResult> {
  const admin = await requireAdmin()
  const target = (email ?? '').trim().toLowerCase()
  if (!target || !target.includes('@')) {
    return { ok: false, error: 'Invalid email.' }
  }

  const sb = createAdminClient()
  const { error } = await sb.auth.resetPasswordForEmail(target, {
    redirectTo: 'https://www.stokiapp.com/auth/callback?next=/auth/reset-password',
  })
  if (error) {
    log.error('admin.password_reset.failed', { adminEmail: admin.email, targetEmail: target, error: error.message })
    return { ok: false, error: error.message }
  }

  log.info('admin.password_reset.sent', {
    adminEmail: admin.email,
    targetEmail: target,
  })
  return {
    ok: true,
    message: `Reset email requested. If SMTP is set they'll receive it within 60 seconds.`,
  }
}
