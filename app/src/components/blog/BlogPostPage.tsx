import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * Reusable blog-post shell. Every /blog/<slug> route is a thin file that
 * (a) imports its post module's `meta` + `Body`, (b) exports metadata via
 * buildBlogMetadata(meta), and (c) renders <BlogPostPage meta={meta}>.
 *
 * Deliberately mirrors ComparisonPage: the shell owns chrome, JSON-LD and
 * metadata; the post owns prose only. Same rule applies — do NOT fork this
 * markup for a one-off post. Add an optional field to BlogPostMeta instead.
 * Divergent per-page markup rots fast across N posts, and a blog is the
 * surface most likely to accumulate N.
 *
 * Why a component shell rather than MDX: the repo has no MDX pipeline, and
 * adding one buys authoring convenience at the cost of a build dependency,
 * a second styling system, and content that typecheck can't see. Posts are
 * written by the same people who write the components; TSX is already the
 * house language.
 */

const SITE = 'https://stokiapp.com'

// ── Data schema ─────────────────────────────────────────────────────

export interface BlogPostMeta {
  /** URL slug — becomes /blog/<slug>. Must match the directory name. */
  slug: string
  /** Page H1 and <title> base. Keep under 60 chars for SERP. */
  title: string
  /** Meta description — 140-160 chars ideal. */
  description: string
  /** ISO date (YYYY-MM-DD) first published — JSON-LD datePublished. */
  published: string
  /** ISO date last materially changed. Defaults to `published`. */
  updated?: string
  /** One-line hook shown on the index card. Should stand alone without
   *  the title — the two sit adjacent and repeating is wasted space. */
  excerpt: string
  /** Short labels for the index filter chips and the post header. */
  tags: string[]
  /** Roughly how long the post takes to read, in minutes. Stated rather
   *  than computed: computing from word count needs the rendered body,
   *  which the index doesn't have. */
  readingMinutes: number
}

/** Canonical metadata builder — every post exports `metadata` from this so
 *  canonical/OG/Twitter stay identical in shape across the blog. */
export function buildBlogMetadata(meta: BlogPostMeta): Metadata {
  const url = `${SITE}/blog/${meta.slug}`
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: meta.title,
      description: meta.description,
      publishedTime: meta.published,
      modifiedTime: meta.updated ?? meta.published,
      images: [{ url: '/og-image.png', width: 1200, height: 627 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: ['/og-image.png'],
    },
  }
}

function formatDate(iso: string): string {
  // en-ZA gives "30 August 2026" — the SA convention, and unambiguous
  // against the US month-first ordering.
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

export default function BlogPostPage({
  meta,
  children,
}: {
  meta: BlogPostMeta
  children: React.ReactNode
}) {
  const url = `${SITE}/blog/${meta.slug}`

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.title,
    description: meta.description,
    datePublished: meta.published,
    dateModified: meta.updated ?? meta.published,
    author: { '@type': 'Organization', name: 'Stoki', url: SITE },
    publisher: {
      '@type': 'Organization',
      name: 'Stoki',
      logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/blog` },
      { '@type': 'ListItem', position: 3, name: meta.title, item: url },
    ],
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-20 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <nav aria-label="Breadcrumb" className="pt-8 text-[13px]">
        <Link href="/blog" className="underline" style={{ color: 'var(--muted)' }}>
          ← All posts
        </Link>
      </nav>

      <header className="mt-6 mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {meta.tags.map(tag => (
            <span
              key={tag}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{
                background: 'rgba(0,200,150,0.10)',
                border: '1px solid rgba(0,200,150,0.25)',
                color: 'var(--brand, #00c98d)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        <h1
          className="text-3xl sm:text-4xl font-bold leading-tight"
          style={{ color: 'var(--foreground)' }}
        >
          {meta.title}
        </h1>

        <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
          {meta.excerpt}
        </p>

        <div className="mt-4 text-[13px]" style={{ color: 'var(--muted-dim)' }}>
          <time dateTime={meta.published}>{formatDate(meta.published)}</time>
          <span aria-hidden> · </span>
          {meta.readingMinutes} min read
          {meta.updated && meta.updated !== meta.published && (
            <>
              <span aria-hidden> · </span>
              Updated <time dateTime={meta.updated}>{formatDate(meta.updated)}</time>
            </>
          )}
        </div>
      </header>

      <article className="blog-prose">{children}</article>

      {/* Product CTA — earned by the post above, kept to one block. */}
      <section
        className="mt-12 rounded-2xl p-5 sm:p-6"
        style={{
          background: 'rgba(0,200,150,0.05)',
          border: '1px solid rgba(0,200,150,0.25)',
        }}
      >
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
          Run your whole business in one app
        </h2>
        <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--muted)' }}>
          Stoki does the till, stock, credit book, invoicing, VAT201 and payroll —
          with an AI advisor that knows what the SA economy is doing to your margins.
          Free forever for your first store.
        </p>
        <Link
          href="/register"
          className="btn-gloss inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-semibold"
        >
          Start free
        </Link>
      </section>
    </main>
  )
}
