import Link from 'next/link'

/**
 * Friendly "you don't have access to this page" placeholder for cashier-role
 * users who somehow reached an owner/manager-only route via direct URL.
 * The dashboard already hides these tiles from cashiers; this is the
 * defence-in-depth UI.
 */
export default function RestrictedNotice({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="px-4 pt-12 pb-4 text-center">
      <p className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{title}</p>
      <p className="text-muted text-sm mb-6">{description}</p>
      <Link href="/dashboard" className="text-brand text-sm font-semibold">← Back to dashboard</Link>
    </div>
  )
}
