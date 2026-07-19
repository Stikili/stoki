import type { MetadataRoute } from 'next'

/**
 * Auto-generated /sitemap.xml. Google + Bing crawl this to discover every
 * indexable route without depending on internal linking.
 *
 * Only include PUBLIC routes here — anything behind auth (dashboard,
 * settings, credit, etc.) is inside the (app) route group and is not
 * indexable anyway. Adding them here just wastes crawl budget on 401s.
 *
 * When a new public route ships (blog post, comparison page, landing
 * variant), add it to the array below.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://stokiapp.com'
  const now = new Date()

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${base}/pricing`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    // Comparison pages — high-intent SEO. Add one entry per page as
    // /compare/* pages ship.
    {
      url: `${base}/compare/stoki-vs-loyverse`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/compare/stoki-vs-yoco`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/compare/stoki-vs-xero`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/compare/stoki-vs-sage`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/compare/stoki-vs-ikhokha`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Guides — long-tail educational SEO. High priority since each guide
    // targets a distinct high-volume SA search intent.
    {
      url: `${base}/guides/how-to-submit-vat201-south-africa`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]
}
