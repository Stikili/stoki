import type { BlogPostMeta } from '@/components/blog/BlogPostPage'
import { meta as costReportAug2026 } from './sa-small-business-cost-report-august-2026'

/**
 * Single registry of published posts.
 *
 * Everything that needs to know what posts exist reads THIS — the index
 * page, the sitemap, and any future RSS feed. Each post's route file
 * imports its own module directly, so the metadata here and the metadata
 * the page renders are the same object; there is no second copy to drift.
 *
 * To publish a post: create the module under content/blog/, add its `meta`
 * here, and add the thin route file at app/(marketing)/blog/<slug>/page.tsx.
 * The sitemap picks it up automatically.
 */
const POSTS_UNSORTED: BlogPostMeta[] = [
  costReportAug2026,
]

/** Newest first — the order the index renders and the order humans expect. */
export const POSTS: BlogPostMeta[] = [...POSTS_UNSORTED].sort(
  (a, b) => b.published.localeCompare(a.published),
)

export function findPost(slug: string): BlogPostMeta | undefined {
  return POSTS.find(p => p.slug === slug)
}
