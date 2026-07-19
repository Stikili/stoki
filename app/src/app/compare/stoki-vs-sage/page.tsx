import ComparisonPage, {
  buildComparisonMetadata,
  type ComparisonPageData,
} from '@/components/compare/ComparisonPage'

/**
 * SEO anchor page for "Stoki vs Sage" and adjacent SA-search queries
 * (Sage One alternative, Sage Accounting South Africa, small business
 * accounting SA).
 *
 * Sage is the incumbent SA accounting brand — older than Xero locally,
 * heavier product, deep accountant channel via Sage certification. We're
 * honest about that. Stoki wins on modern UX, price, integrated POS,
 * WhatsApp, and AI — but is not a replacement for Sage in accountant-
 * managed SMBs that already have chart-of-accounts + audit workflows.
 */

const data: ComparisonPageData = {
  slug: 'stoki-vs-sage',
  competitor: 'Sage',
  updated: '2026-07-19',
  title: 'Stoki vs Sage — SA Small Business Accounting Compared (2026)',
  description:
    'Honest 2026 comparison of Stoki and Sage One / Sage Accounting for South African SMMEs. Price, POS, VAT201, PAYE, WhatsApp, AI, offline — side-by-side.',
  ogDescription:
    'Sage has the accountant channel and formal accounting depth. Stoki wins on price, modern UX, integrated POS, WhatsApp bot, and AI. Honest SA comparison.',
  headline: 'Stoki vs Sage — SA small business accounting compared',
  intro:
    "Sage is South Africa's incumbent accounting brand — older than Xero locally, deep accountant certification network, comprehensive product. Stoki is a modern SA-native business OS built for owner-run SMMEs. Written by Stoki — we're honest about where Sage still wins (formal accounting, accountant ecosystem, audit trail) and where we don't.",
  tldr: [
    "Sage wins for established SMEs already working with a Sage-certified accountant, needing formal double-entry accounting, deep audit trail, or Sage Payroll's mature SA localisation.",
    "Stoki wins for owner-run SMMEs that want one app for the whole business — POS, credit book, VAT201, PAYE, invoicing, AI advisor, WhatsApp — at a fraction of Sage's price and with a modern mobile-first interface.",
    "They can coexist. Some businesses use Stoki for daily operations (till, credit book, WhatsApp, receipts) and Sage for the accountant's monthly close.",
  ],
  rows: [
    { feature: 'Entry price (ZAR)', competitor: 'Sage One ~R199-R249/mo', stoki: 'Free forever for first store', winner: 'stoki' },
    { feature: 'Mid tier price (ZAR)', competitor: 'Sage Accounting ~R390-R490/mo', stoki: 'Pro tier priced under Sage One', winner: 'stoki' },
    { feature: 'SA VAT201', competitor: 'Yes — native, well-established', stoki: 'Native — auto-generated block 1-15 export', winner: 'tie' },
    { feature: 'PAYE / UIF / SDL / EMP201', competitor: 'Sage Payroll (separate product, extra cost)', stoki: 'Native — no separate product needed', winner: 'stoki' },
    { feature: 'Payroll depth', competitor: 'Sage Payroll is comprehensive — the SA standard', stoki: 'Covers PAYE/UIF/SDL/EMP201 + payslips', winner: 'competitor' },
    { feature: 'Point of sale (till)', competitor: 'Not native — requires third-party POS integration', stoki: 'Full POS with VAT receipts, weighables, airtime', winner: 'stoki' },
    { feature: 'Inventory', competitor: 'Basic — more so on higher tiers', stoki: 'Full — categories, wastage, expiry, stocktake, POs', winner: 'stoki' },
    { feature: 'Credit book (informal debtors)', competitor: 'Not modelled — uses formal customer / invoice flow', stoki: 'Native — WhatsApp reminders, aging report, kasi-friendly', winner: 'stoki' },
    { feature: 'Bank feeds (SA banks)', competitor: 'Yes — native SA bank feeds', stoki: 'CSV import today; native feeds coming', winner: 'competitor' },
    { feature: 'Accountant ecosystem', competitor: 'Huge — Sage-certified accountants across SA', stoki: 'Accountant collab mode coming; export packs available', winner: 'competitor' },
    { feature: 'Formal accounting (GL, TB, journal entries)', competitor: 'Deep — full double-entry, TB, GL, BS, IS, audit trail', stoki: 'Focused on SMME reporting, not formal double-entry', winner: 'competitor' },
    { feature: 'Modern mobile-first UX', competitor: 'Desktop-first origin — mobile catching up', stoki: 'Mobile-first PWA, offline-capable', winner: 'stoki' },
    { feature: 'AI business advisor', competitor: 'Not native (Sage Copilot in preview, limited SA context)', stoki: 'Native — grounded in your data + SA economy', winner: 'stoki' },
    { feature: 'WhatsApp bot', competitor: 'Not supported', stoki: 'Record sales, ask questions, get answers on WhatsApp', winner: 'stoki' },
    { feature: 'Airtime / data PIN dispensing', competitor: 'Not supported', stoki: 'Yes — sell airtime as inventory', winner: 'stoki' },
    { feature: 'Offline support', competitor: 'Cloud-first; some desktop options', stoki: 'Offline-first PWA — sales queue during load-shedding', winner: 'stoki' },
    { feature: 'Third-party integrations', competitor: 'Broad SA + international connectors', stoki: 'Limited — Meta WhatsApp, Ozow, Sentry, Vercel', winner: 'competitor' },
    { feature: 'AI voice adapts to owner', competitor: 'N/A', stoki: 'Kasi / Plain / Professional / Technical — one setting', winner: 'stoki' },
    { feature: 'SA market context', competitor: 'SA-localised global platform', stoki: 'Built in Cape Town for SA — SASSA, load-shedding, kasi', winner: 'stoki' },
    { feature: 'Onboarding effort', competitor: 'Multi-hour — typically accountant-assisted', stoki: 'Under 15 min self-serve on mobile', winner: 'stoki' },
  ],
  chooseCompetitor: [
    'You already have a Sage-certified accountant who does your books — stick with what your accountant knows.',
    'You need formal double-entry accounting depth: journal entries, general ledger, trial balance, comprehensive audit trail.',
    'You use Sage Payroll and depend on its mature SA-localised payslip / IRP5 tooling.',
    'You need broad third-party integrations (SA banks, tax firms, ERP add-ons).',
    'You have a bookkeeper or accountant who handles software choices for you.',
  ],
  chooseStoki: [
    'You run the business yourself and want one app instead of Sage One + POS + payroll add-on + card reader.',
    'You want a modern mobile-first product designed for how SA SMMEs actually work — on a phone, in a shop, with intermittent Wi-Fi.',
    'You want a POS (till) built into the same app as your books — Sage One does not include one.',
    'You want SA compliance (VAT201, PAYE/UIF/SDL, EMP201) native in a single tier, not spread across three products.',
    'You need a credit book for informal debtors — the kind of customer who says "I\'ll pay Friday" — which Sage does not model.',
    'You want an AI advisor that answers "how is business?" grounded in your data and the SA economy.',
    'You want to run your business from WhatsApp.',
    'Your budget is R99-R299/month, not R199-R490+/month.',
    'You sell airtime / data / bundles as inventory.',
  ],
  runBoth:
    'A common SA setup for growing SMMEs with an accountant relationship: <strong>Stoki for daily operations</strong> (till, credit book, WhatsApp orders, receipts via photo, AI advisor), <strong>Sage One for the accountant view</strong> (formal accounting, bank recs, month-end close). Export from Stoki monthly (CSV / XLSX / VAT201 pack) and your accountant imports into Sage. You get Stoki\'s speed daily and Sage\'s formality for the accountant relationship.',
  pricingIntro:
    'Both companies price in ZAR. Sage is priced for accountant-managed formal SMEs; Stoki is priced for owner-run SMMEs. Roughly half the cost at each comparable tier, with more features included.',
  pricingBullets: [
    { label: 'Sage One', body: 'around R199-R249/mo depending on features. Bank rec + invoicing + basic reporting. Payroll requires the separate Sage Payroll product.' },
    { label: 'Sage Accounting', body: 'around R390-R490/mo. Multi-user, advanced reports, more depth. Payroll still separate.' },
    { label: 'Stoki Free', body: 'free forever for your first store — POS, inventory, credit book, VAT201 export, basic reports.' },
    { label: 'Stoki Pro', body: 'monthly ZAR subscription well under Sage One. Payroll, invoicing, unlimited users, AI advisor, multi-store, WhatsApp bot — all included, no separate products.' },
  ],
  faqs: [
    { q: 'Is Stoki a Sage alternative for South Africa?', a: 'Yes — for owner-run SMMEs. Stoki is designed to replace Sage One for South African small businesses that don\'t need formal double-entry accounting or a Sage-certified accountant\'s workflow. It\'s cheaper, includes POS + payroll + credit book natively (Sage doesn\'t bundle these), and adds a WhatsApp bot + AI advisor Sage doesn\'t have. If a Sage-certified accountant runs your books already, stick with Sage.' },
    { q: 'Should I move from Sage One to Stoki?', a: 'Only if your accountant is open to it or you\'re self-managing your books. Stoki is not a drop-in Sage replacement for accountant-managed businesses that need journal entries, TB, GL, and formal audit trails. It IS a good replacement for owner-managed SMMEs that just need VAT201, PAYE, invoicing, POS, and expense tracking — half the price and much simpler.' },
    { q: 'Does Sage have a POS in South Africa?', a: 'Not natively. Sage integrates with third-party POS providers (Vend, Lightspeed, Shopify POS, etc.) but you subscribe to and configure that separately. Stoki has a POS built into the same app.' },
    { q: 'Does Stoki have Sage-level payroll?', a: 'Stoki covers the essentials: PAYE, UIF, SDL, EMP201 export, payslips, employee management. Sage Payroll has deeper localisation (advanced deductions, IRP5 generation, integrated leave / performance modules). If your payroll is complex or you already use Sage Payroll, keep it. For simpler SMME payroll needs, Stoki is included in the same subscription.' },
    { q: 'Does my accountant support Stoki?', a: 'Most SA accountants are trained on Sage, Xero, Pastel, or QuickBooks. Stoki exports data in CSV / XLSX / PDF that any accountant can import into whatever they use — VAT201 workings, expense ledger, sales journal, payroll summary. An accountant-collaboration mode (read-only invite + comment threads) is on our roadmap.' },
    { q: 'What\'s the price difference between Stoki and Sage?', a: 'Roughly 2-3x. Sage One is around R199-R249/mo; Stoki\'s Pro tier is well under half that. Sage Accounting is around R390-R490/mo; Stoki Business is around a third of that. Stoki Free covers what Sage One offers, for R0. Note: Sage pricing changes periodically — check sage.com for their current SA pricing.' },
    { q: 'Can I run Stoki and Sage together?', a: 'Yes. A common setup: Stoki for daily operations (till, credit book, WhatsApp, expenses, AI advisor), Sage for the accountant\'s monthly view (bank reconciliation, GL, formal reporting). Export from Stoki monthly and your accountant reconciles it in Sage.' },
    { q: 'Which is better for a spaza shop or informal trader?', a: 'Stoki, comfortably. Sage One is designed for formal SMEs with an accountant. Spaza shops and informal traders need a credit book, airtime PIN dispensing, offline sales, and WhatsApp — all native in Stoki, none in Sage.' },
  ],
}

export const metadata = buildComparisonMetadata(data)
export default function Page() { return <ComparisonPage data={data} /> }
