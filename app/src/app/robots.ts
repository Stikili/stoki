import type { MetadataRoute } from 'next'

/**
 * Auto-generated /robots.txt.
 *
 * Allows crawling of public marketing surfaces; forbids the app itself,
 * API routes, and admin — none of which have SEO value and all of which
 * either 401 or contain per-user data. The Sitemap directive points
 * Google + Bing at the auto-generated /sitemap.xml.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin',
          '/auth/',
          '/onboarding',
          // Every route inside the (app) route group renders under these
          // top-level slugs. Blocking them cheaply prevents Googlebot from
          // hitting auth-gated pages and wasting crawl budget on 401 pages.
          '/dashboard',
          '/sales',
          '/inventory',
          '/credit',
          '/expenses',
          '/reports',
          '/settings',
          '/vat',
          '/payroll',
          '/invoices',
          '/broadcasts',
          '/stores',
          '/alerts',
          '/advisor',
          '/stocktake',
          '/procurement',
          '/assets',
          '/customers',
        ],
      },
    ],
    sitemap: 'https://stokiapp.com/sitemap.xml',
    host: 'https://stokiapp.com',
  }
}
