import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * Reusable comparison-page component. Every /compare/stoki-vs-<x> route
 * is a thin file that (a) declares its ComparisonPageData literal,
 * (b) exports metadata via buildComparisonMetadata(data), and
 * (c) renders <ComparisonPage data={data} />.
 *
 * Owns:
 *   - Layout (breadcrumb, header, TL;DR, table, segments, pricing, FAQ, CTA)
 *   - JSON-LD (Article + FAQPage + BreadcrumbList)
 *   - Metadata builder (canonical, OG, Twitter, alternates)
 *
 * Consumer owns: the content (data), only.
 *
 * When adding a new comparison, DO NOT extend this file's markup for
 * per-page customisation — add optional fields to ComparisonPageData
 * instead. Divergent per-page markup rots fast across N pages.
 */

const SITE = 'https://stokiapp.com'

// ── Data schema ─────────────────────────────────────────────────────

export interface ComparisonRow {
  feature: string
  competitor: string
  stoki: string
  /** 'stoki' | 'competitor' | 'tie' — drives the ✓ marker + bold text. */
  winner: 'stoki' | 'competitor' | 'tie'
}

export interface ComparisonFaq {
  q: string
  a: string
}

export interface ComparisonPageData {
  /** URL slug — becomes /compare/<slug>. Must match the directory name. */
  slug: string
  /** Human name of the competitor, used everywhere in copy. */
  competitor: string
  /** ISO date (YYYY-MM-DD) — populates the "Updated" banner + JSON-LD dateModified. */
  updated: string
  /** ISO date first published — JSON-LD datePublished. Defaults to `updated`. */
  published?: string
  /** Custom page <title>. Keep under 60 chars for SERP. */
  title: string
  /** Meta description — 140-160 chars ideal. */
  description: string
  /** Longer copy used for OG + Twitter (can be more evocative than description). */
  ogDescription?: string
  /** Page H1. */
  headline: string
  /** 1-2 sentences under the H1 setting expectations. */
  intro: string
  /** TL;DR bullets — Featured Snippet bait. 2-4 items. Use plain text; the
   *  component wraps the first sentence-fragment in <strong>. */
  tldr: string[]
  /** Feature-by-feature comparison rows. */
  rows: ComparisonRow[]
  /** "Choose <competitor> if…" section. */
  chooseCompetitor: string[]
  /** "Choose Stoki if…" section. */
  chooseStoki: string[]
  /** Optional "Run both?" section — omit when the two products aren't
   *  side-by-sideable (e.g. two accounting SaaSes). */
  runBoth?: string
  /** Pricing prose intro (1 short paragraph). */
  pricingIntro: string
  /** Pricing bullets — each bullet describes one plan/tier. */
  pricingBullets: Array<{ label: string; body: string }>
  /** FAQ items — populate both the visible <details> list AND JSON-LD FAQPage. */
  faqs: ComparisonFaq[]
  /** Optional footer note ("we may have this wrong — email us"). */
  footerNote?: string
}

// ── Metadata builder ────────────────────────────────────────────────

/** Build a static Metadata object from ComparisonPageData. Route files
 *  do `export const metadata = buildComparisonMetadata(data)`. */
export function buildComparisonMetadata(data: ComparisonPageData): Metadata {
  const url = `${SITE}/compare/${data.slug}`
  return {
    title: data.title,
    description: data.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: data.title,
      description: data.ogDescription ?? data.description,
      images: [{ url: '/og-image.png', width: 1200, height: 627 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.title,
      description: data.ogDescription ?? data.description,
      images: ['/og-image.png'],
    },
  }
}

// ── Component ───────────────────────────────────────────────────────

export default function ComparisonPage({ data }: { data: ComparisonPageData }) {
  const url = `${SITE}/compare/${data.slug}`
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data.title,
    description: data.description,
    author: { '@type': 'Organization', name: 'Stoki', url: SITE },
    publisher: {
      '@type': 'Organization', name: 'Stoki',
      logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512.png` },
    },
    datePublished: data.published ?? data.updated,
    dateModified: data.updated,
    image: `${SITE}/og-image.png`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    // 2-level breadcrumb — /compare index page doesn't exist, so we
    // don't emit a middle crumb pointing at a 404. If a /compare
    // index ships later, restore the middle crumb.
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: `Stoki vs ${data.competitor}`, item: url },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([article, faqSchema, breadcrumb]) }}
      />

      <article className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-16" style={{ color: 'var(--foreground)' }}>
        <nav aria-label="Breadcrumb" className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">›</span>
          <span>Compare</span>
          <span className="mx-2">›</span>
          <span>Stoki vs {data.competitor}</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#00C896' }}>
            Comparison · Updated {formatDate(data.updated)}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--foreground)' }}>
            {data.headline}
          </h1>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
            {data.intro}
          </p>
        </header>

        <section aria-labelledby="tldr" className="mb-10 rounded-2xl p-5 sm:p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 id="tldr" className="text-lg font-bold mb-3" style={{ color: 'var(--foreground)' }}>TL;DR</h2>
          <ul className="list-disc ml-5 space-y-2 text-sm leading-relaxed">
            {data.tldr.map((line, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: emphasiseHead(line) }} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="feature-comparison" className="mb-10">
          <h2 id="feature-comparison" className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Feature-by-feature comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--card-border)' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface)' }}>
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>Feature</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>{data.competitor}</th>
                  <th className="text-left px-3 sm:px-4 py-3 font-semibold" style={{ color: '#00C896' }}>Stoki</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr
                    key={r.feature}
                    style={{
                      background: i % 2 === 0 ? 'transparent' : 'var(--surface)',
                      borderTop: '1px solid var(--card-border)',
                    }}
                  >
                    <td className="px-3 sm:px-4 py-3 font-semibold" style={{ color: 'var(--foreground)', minWidth: '160px' }}>
                      {r.feature}
                    </td>
                    <td
                      className="px-3 sm:px-4 py-3"
                      style={{
                        color: r.winner === 'competitor' ? 'var(--foreground)' : 'var(--muted)',
                        fontWeight: r.winner === 'competitor' ? 600 : 400,
                      }}
                    >
                      {r.competitor}
                      {r.winner === 'competitor' && <span className="ml-1.5 text-[10px] font-bold" style={{ color: '#00C896' }}>✓</span>}
                    </td>
                    <td
                      className="px-3 sm:px-4 py-3"
                      style={{
                        color: r.winner === 'stoki' ? 'var(--foreground)' : 'var(--muted)',
                        fontWeight: r.winner === 'stoki' ? 600 : 400,
                      }}
                    >
                      {r.stoki}
                      {r.winner === 'stoki' && <span className="ml-1.5 text-[10px] font-bold" style={{ color: '#00C896' }}>✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="who-wins" className="mb-10 space-y-8">
          <h2 id="who-wins" className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Who wins for whom?
          </h2>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Choose {data.competitor} if…
            </h3>
            <ul className="list-disc ml-5 space-y-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {data.chooseCompetitor.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          </div>

          <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.25)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Choose Stoki if…
            </h3>
            <ul className="list-disc ml-5 space-y-1.5 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {data.chooseStoki.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
          </div>

          {data.runBoth && (
            <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>Run both?</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }} dangerouslySetInnerHTML={{ __html: data.runBoth }} />
            </div>
          )}
        </section>

        <section aria-labelledby="pricing" className="mb-10">
          <h2 id="pricing" className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>Pricing</h2>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>{data.pricingIntro}</p>
          <ul className="list-disc ml-5 space-y-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            {data.pricingBullets.map((b, i) => (
              <li key={i}>
                <strong style={{ color: 'var(--foreground)' }}>{b.label}:</strong> {b.body}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq" className="mb-10">
          <h2 id="faq" className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {data.faqs.map(f => (
              <details
                key={f.q}
                className="rounded-xl p-4"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <summary className="font-semibold cursor-pointer text-sm sm:text-base" style={{ color: 'var(--foreground)' }}>
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="cta" className="text-center py-8">
          <h2 id="cta" className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>Try Stoki free</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Free forever for your first store · 120-day Business trial · No card required
          </p>
          <Link
            href="/register"
            className="btn-gloss inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-[15px]"
          >
            <span className="relative z-10">Get started at stokiapp.com →</span>
          </Link>
        </section>

        {/* Last-updated + accuracy note — kept as a <p> (not <footer>)
            since the shared MarketingFooter (from the (marketing) route
            group layout) now carries the site-wide footer. */}
        <p
          className="mt-8 pt-4 text-xs text-center"
          style={{ borderTop: '1px solid var(--card-border)', color: 'var(--muted)' }}
        >
          {data.footerNote ?? (
            <>
              Last updated {formatDate(data.updated)}. {data.competitor} features are based on their published product docs at the time of writing. If we&apos;ve got something wrong, email{' '}
              <a href="mailto:hello@stokiapp.com" className="underline" style={{ color: '#00C896' }}>hello@stokiapp.com</a>
              {' '}and we&apos;ll fix it.
            </>
          )}
        </p>
      </article>
    </>
  )
}

// ── Utility helpers ─────────────────────────────────────────────────

/** Format an ISO date as "18 July 2026". */
function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

/** Wrap the first bolded segment (up to the first period, dash, or 60
 *  chars) in <strong> so TL;DR bullets read as "verdict + reason". */
function emphasiseHead(text: string): string {
  const m = text.match(/^([^.–—]{4,60}?)(\s+.+)$/)
  if (!m) return escapeHtml(text)
  return `<strong>${escapeHtml(m[1])}</strong>${escapeHtml(m[2])}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
