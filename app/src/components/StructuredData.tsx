/**
 * JSON-LD structured data injected into every page via the root layout.
 *
 * Gives Google + Bing the machine-readable identity of Stoki so it can
 * populate Knowledge Panels, rich results, and disambiguate the brand.
 * Three schemas — Organization (who we are), SoftwareApplication (what
 * we sell), WebSite (site + sitelinks search box).
 *
 * Rendered via a plain `<script type="application/ld+json">` tag rather
 * than the deprecated `next/script` strategy for JSON-LD. Server-rendered
 * so crawlers see it without executing JS.
 *
 * Update the URLs / description here if the marketing surface changes;
 * NEVER put per-user or per-request data in this component — it's cached
 * with the layout and would leak across users.
 */
export default function StructuredData() {
  const site = 'https://stokiapp.com'

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site}/#organization`,
    name: 'Stoki',
    url: site,
    logo: `${site}/icons/icon-512.png`,
    description:
      'The AI-powered business assistant for South African SMMEs — informal and formal, from a street trader with one product to a VAT-registered business with staff.',
    foundingDate: '2025',
    areaServed: {
      '@type': 'Country',
      name: 'South Africa',
    },
    sameAs: [
      'https://www.linkedin.com/company/stokiapp',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@stokiapp.com',
      contactType: 'customer support',
      availableLanguage: ['en', 'af', 'zu', 'xh', 'st'],
    },
  }

  const softwareApp = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${site}/#software`,
    name: 'Stoki',
    description:
      'The AI-powered business assistant for South African SMMEs. Sales, stock, credit book, VAT201, payroll, and an AI advisor grounded in the SA economy — one app, on WhatsApp or the web, even offline.',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'AccountingSoftware',
    operatingSystem: 'Web, iOS (PWA), Android (PWA)',
    url: site,
    image: `${site}/og-image.png`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'ZAR',
      description: 'Free forever for your first store. 120-day Business trial for everyone.',
    },
    featureList: [
      'Point of sale (POS) with VAT-aware receipts',
      'Inventory / stock management with expiry alerts',
      'Credit book for informal debtors',
      'B2B invoicing with WhatsApp delivery',
      'Payroll — PAYE, UIF, SDL, EMP201 export',
      'VAT201 reporting',
      'AI business advisor grounded in the SA economy',
      'WhatsApp bot — sell, invoice, ask questions',
      'Offline-first PWA — works during load-shedding',
    ],
    audience: {
      '@type': 'BusinessAudience',
      audienceType: 'South African SMMEs — informal traders, service businesses, formal VAT-registered small businesses',
    },
    provider: { '@id': `${site}/#organization` },
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site}/#website`,
    url: site,
    name: 'Stoki',
    publisher: { '@id': `${site}/#organization` },
    inLanguage: 'en-ZA',
  }

  const combined = [organization, softwareApp, website]

  return (
    <script
      type="application/ld+json"
      // Stringify without spaces to minimise bytes; crawlers don't care
      // about whitespace and every byte in <head> counts for LCP.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(combined) }}
    />
  )
}
