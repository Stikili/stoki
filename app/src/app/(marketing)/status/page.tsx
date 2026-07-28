import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * Public /status page — SaaS-convention trust builder.
 *
 * Static-only for now (no live checks). Lists the surfaces users
 * depend on (app, API, cron jobs, WhatsApp bot, AI advisor) and
 * points readers to Vercel's live status page for real-time
 * infrastructure state. When we outgrow this, the natural upgrade
 * is BetterStack / Statuspage / a self-hosted uptime dashboard —
 * this page's shape then becomes a live badge grid.
 *
 * Deliberately no false liveness — an "operational" hardcoded label
 * that stays green during a real outage is worse than no status page.
 * The wording ("If a surface is degraded, we'll update this page and
 * the LinkedIn company page") sets expectations honestly.
 */

const SITE = 'https://stokiapp.com'
const PAGE_URL = `${SITE}/status`

export const metadata: Metadata = {
  title: 'System status — Stoki',
  description:
    'Current operational status of every Stoki surface — app, API, cron jobs, WhatsApp bot, AI advisor. If something is down we update this page and the LinkedIn company page.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'Stoki — system status',
    description: 'Current operational status of every Stoki surface.',
    images: [{ url: '/og-image.png', width: 1200, height: 627 }],
  },
  robots: {
    // Index this so users Googling "stoki status" find the right page
    // rather than a third-party downdetector result.
    index: true,
    follow: true,
  },
}

interface Surface {
  name: string
  description: string
  depends_on: string
}

const SURFACES: Surface[] = [
  { name: 'Web app (stokiapp.com)',            description: 'The Stoki dashboard, POS, inventory, credit book, settings, and every other in-app screen.',                       depends_on: 'Vercel (hosting), Supabase (database)' },
  { name: 'API + cron jobs',                    description: 'Server actions, /api routes, and the daily cron jobs that push alerts, refresh market data, and post recurring expenses.', depends_on: 'Vercel Serverless Functions, Supabase' },
  { name: 'AI advisor (in-app + WhatsApp)',     description: 'The Stoki AI assistant answering questions grounded in your business data + SA economic context.',                depends_on: 'Anthropic Claude API, Supabase' },
  { name: 'WhatsApp bot',                       description: 'Two-way messaging on your Stoki WhatsApp number — sending questions, receiving answers, logging sales by chat.',    depends_on: 'Meta WhatsApp Cloud API' },
  { name: 'Push notifications',                 description: 'Web-push alerts for low stock, daily summaries, margin erosion, anomaly detection, monthly reports.',              depends_on: 'Vercel cron, VAPID push service' },
  { name: 'Bank statement reconciliation',      description: 'CSV import + auto-matching against invoices and expenses. Works with FNB, Standard, ABSA, Nedbank, Capitec.',    depends_on: 'Stoki server (no third-party dependency)' },
  { name: 'Payments (Ozow — coming)',           description: 'ZAR checkout for Pro / Business tiers. Not yet wired; every new account currently gets a 120-day Business trial as immediate access.', depends_on: 'Ozow (scheduled ~2026-08-19)' },
]

const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
    { '@type': 'ListItem', position: 2, name: 'Status', item: PAGE_URL },
  ],
}

export default function StatusPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <main className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-16" style={{ color: 'var(--foreground)' }}>
        <nav aria-label="Breadcrumb" className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">›</span>
          <span>Status</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#00C896' }}>
            System status
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--foreground)' }}>
            Where Stoki stands.
          </h1>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
            The surfaces your business depends on and where to check if something is degraded. We deliberately do not fake &quot;all systems operational&quot; badges — if a surface is having trouble, we&apos;ll say so here and on our{' '}
            <a
              href="https://www.linkedin.com/company/stokiapp"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: '#00C896' }}
            >
              LinkedIn company page
            </a>.
          </p>
        </header>

        {/* Current state — one paragraph, honest. */}
        <section aria-labelledby="current" className="mb-10 rounded-2xl p-5" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 id="current" className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Right now
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            No known outages. If your app feels slow, blank, or errors — check{' '}
            <a href="https://www.vercel-status.com/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#00C896' }}>vercel-status.com</a>
            {' '}(hosting) and{' '}
            <a href="https://status.supabase.com/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#00C896' }}>status.supabase.com</a>
            {' '}(database). Anything we can see on our side, we&apos;ll post on LinkedIn within a few minutes.
          </p>
        </section>

        {/* Surface list — what depends on what. */}
        <section aria-labelledby="surfaces" className="mb-10">
          <h2 id="surfaces" className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Surfaces
          </h2>
          <div className="space-y-3">
            {SURFACES.map(s => (
              <div
                key={s.name}
                className="rounded-2xl p-4"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{s.name}</p>
                <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>{s.description}</p>
                <p className="text-[11px] mt-2" style={{ color: 'var(--muted-dim)' }}>
                  Depends on: {s.depends_on}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* What to do if something's broken. */}
        <section aria-labelledby="something-broken" className="mb-10">
          <h2 id="something-broken" className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            If something is broken for you
          </h2>
          <ol className="list-decimal ml-5 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Check your connection first</strong> — Stoki is offline-first, so a Wi-Fi drop should queue your work rather than break it. If you&apos;re seeing a spinning indicator that never resolves, your connection is the most common culprit.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Look at the two upstream status pages</strong> linked above (Vercel + Supabase). If either shows a regional incident, that&apos;s almost certainly the cause.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Check our LinkedIn page</strong> —{' '}
              <a
                href="https://www.linkedin.com/company/stokiapp"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: '#00C896' }}
              >
                linkedin.com/company/stokiapp
              </a>. We post outage updates and ETA-to-resolved there.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Email us</strong>{' '}
              <a href="mailto:support@stokiapp.com" className="underline" style={{ color: '#00C896' }}>support@stokiapp.com</a>
              {' '}with a screenshot + the time it happened. We aim to reply within 4 business hours (faster on Business + Enterprise tiers).
            </li>
          </ol>
        </section>

        {/* Footer removed — the shared MarketingFooter (mounted by
            app/(marketing)/layout.tsx) now carries reg number + legal
            links across every marketing page. */}
      </main>
    </>
  )
}
