import BlogPostPage, { buildBlogMetadata } from '@/components/blog/BlogPostPage'
import Body, { meta } from '@/content/blog/sa-small-business-cost-report-august-2026'

/**
 * Thin route file — same shape as the /compare pages. Content lives in the
 * content module; chrome, JSON-LD and metadata live in BlogPostPage.
 */

export const metadata = buildBlogMetadata(meta)

export default function Page() {
  return (
    <BlogPostPage meta={meta}>
      <Body />
    </BlogPostPage>
  )
}
