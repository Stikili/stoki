import type { Metadata } from 'next'
import Link from 'next/link'
import { POSTS } from '@/content/blog'

/**
 * /blog index. Reads the post registry rather than a hand-maintained list,
 * so publishing a post is one registry entry plus its route file.
 *
 * No pagination yet — YAGNI until there are enough posts to need it. When
 * that lands, paginate here rather than splitting the registry.
 */

const SITE = 'https://stokiapp.com'
const PAGE_URL = `${SITE}/blog`

export const metadata: Metadata = {
  title: 'Blog — Stoki',
  description:
    'Practical writing for South African small businesses: monthly cost reports, SARS and compliance explainers, and what the SA economy is doing to your margins.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'Stoki Blog — writing for SA small businesses',
    description:
      'Monthly cost reports, SARS explainers, and what the SA economy is doing to your margins.',
    images: [{ url: '/og-image.png', width: 1200, height: 627 }],
  },
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

export default function Page() {
  const listing = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Stoki Blog',
    url: PAGE_URL,
    publisher: { '@type': 'Organization', name: 'Stoki', url: SITE },
    blogPost: POSTS.map(p => ({
      '@type': 'BlogPosting',
      headline: p.title,
      description: p.description,
      datePublished: p.published,
      dateModified: p.updated ?? p.published,
      url: `${SITE}/blog/${p.slug}`,
    })),
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-20 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listing) }}
      />

      <header className="pt-10 mb-10">
        <h1
          className="text-3xl sm:text-4xl font-bold leading-tight"
          style={{ color: 'var(--foreground)' }}
        >
          Blog
        </h1>
        <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
          Practical writing for South African small businesses — monthly cost
          reports, SARS explainers, and what the economy is actually doing to
          your margins.
        </p>
      </header>

      {POSTS.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>First post coming shortly.</p>
      ) : (
        <ul className="space-y-4">
          {POSTS.map(post => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="card tile-press block rounded-2xl p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                  {post.tags.map(tag => (
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

                <h2
                  className="text-xl font-bold leading-snug"
                  style={{ color: 'var(--foreground)' }}
                >
                  {post.title}
                </h2>

                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {post.excerpt}
                </p>

                <div className="mt-3 text-[13px]" style={{ color: 'var(--muted-dim)' }}>
                  <time dateTime={post.published}>{formatDate(post.published)}</time>
                  <span aria-hidden> · </span>
                  {post.readingMinutes} min read
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
