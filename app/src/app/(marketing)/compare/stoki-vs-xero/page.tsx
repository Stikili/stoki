import ComparisonPage, {
  buildComparisonMetadata,
  type ComparisonPageData,
} from '@/components/compare/ComparisonPage'

/**
 * SEO anchor page for "Stoki vs Xero" and adjacent queries
 * (Xero alternative SA, cheap accounting software South Africa,
 * best small business accounting South Africa).
 *
 * Positioning: Xero is a global cloud-accounting SaaS with a strong SA
 * accountant channel. Stoki is a SA-native business OS with accounting
 * built in. They serve overlapping but distinct audiences — Xero for
 * accountant-managed businesses, Stoki for owner-run SMMEs.
 *
 * Be honest about Xero's strengths (bank feeds, accountant ecosystem,
 * formal accounting depth) — those are real gaps for Stoki today.
 */

const data: ComparisonPageData = {
  slug: 'stoki-vs-xero',
  competitor: 'Xero',
  updated: '2026-07-18',
  title: 'Stoki vs Xero — SA Small Business Accounting Compared (2026)',
  description:
    'Honest 2026 comparison of Stoki and Xero for South African SMMEs. Pricing, SA compliance, POS, credit book, WhatsApp, AI advisor, bank feeds — side-by-side.',
  ogDescription:
    'Xero has the accountant ecosystem and bank feeds. Stoki has the WhatsApp bot, AI advisor, POS, credit book, and SA-first pricing. Honest comparison for SA SMMEs.',
  headline: 'Stoki vs Xero — SA small business accounting compared',
  intro:
    "Xero is a global cloud-accounting platform trusted by SA accountants; Stoki is a SA-native business operating system built for owner-run SMMEs. Written by Stoki — we're honest about where Xero wins (bank feeds, accountant ecosystem, formal accounting depth) and where we don't.",
  tldr: [
    'Xero wins for accountant-managed businesses that need deep formal accounting — trial balance, journal entries, general ledger, audit trail, and direct bank feeds from SA banks.',
    'Stoki wins for owner-run SMMEs that want one app for the whole business — POS, credit book, VAT201, PAYE, invoicing, AI advisor, WhatsApp bot — at a fraction of the cost.',
    'They can coexist. Some SA businesses use Stoki daily for operations and export monthly summaries to Xero for their accountant. Both accept CSV / XLSX imports.',
  ],
  rows: [
    { feature: 'Free tier', competitor: 'None — paid from day one (Ignite is the entry plan)', stoki: 'Free forever for your first store', winner: 'stoki' },
    { feature: 'Entry paid tier (ZAR)', competitor: 'Ignite — see xero.com/za for current SA pricing', stoki: 'Pro R99/mo', winner: 'stoki' },
    { feature: 'Mid tier (ZAR)', competitor: 'Grow / Comprehensive — see xero.com/za', stoki: 'Business R249/mo', winner: 'stoki' },
    { feature: 'SA VAT201', competitor: 'Yes — via SA localisation', stoki: 'Native — auto-generated block 1-15 export', winner: 'tie' },
    { feature: 'PAYE / UIF / SDL / EMP201', competitor: 'Requires SimplePay or similar add-on', stoki: 'Native — no add-on needed', winner: 'stoki' },
    { feature: 'Payroll (SA)', competitor: 'Via SimplePay integration (extra cost)', stoki: 'Native — payslips, deductions, EMP201', winner: 'stoki' },
    { feature: 'Point of sale (till)', competitor: 'Not offered — requires 3rd-party POS integration', stoki: 'Full POS with VAT receipts, weighables, airtime', winner: 'stoki' },
    { feature: 'Inventory', competitor: 'Basic (mid tier and above)', stoki: 'Full — categories, wastage, expiry, stocktake, POs', winner: 'stoki' },
    { feature: 'Credit book (informal debtors)', competitor: 'Contacts + invoices, no informal-debtor flow', stoki: 'Native — WhatsApp reminders, aging report, kasi-friendly', winner: 'stoki' },
    { feature: 'Bank feeds (SA banks)', competitor: 'Yes — direct feeds from 8+ SA banks (FNB, Capitec, Standard, ABSA, Nedbank, Investec, TymeBank, RMB)', stoki: 'CSV import today · native feeds coming', winner: 'competitor' },
    { feature: 'Accountant ecosystem', competitor: 'Massive — most SA accountants trained on Xero', stoki: 'Accountant collab mode coming; export packs available', winner: 'competitor' },
    { feature: 'Formal accounting (GL, TB, journal entries)', competitor: 'Deep — full double-entry, journals, TB, BS, income statement', stoki: 'Focused on SMME reporting, not formal double-entry', winner: 'competitor' },
    { feature: 'Audit trail', competitor: 'Comprehensive', stoki: 'Sales / restocks / expenses timestamped; not audit-grade', winner: 'competitor' },
    { feature: 'AI business advisor', competitor: 'Xero Analytics Plus (paid add-on) — mostly forecasting', stoki: 'Native AI advisor grounded in SA economy (SARB, fuel, SARS)', winner: 'stoki' },
    { feature: 'WhatsApp bot', competitor: 'Not supported', stoki: 'Ask questions, log sales, get answers on WhatsApp', winner: 'stoki' },
    { feature: 'B2B invoicing', competitor: 'Excellent — recurring, quotes, tracking', stoki: 'PDF invoices + WhatsApp/email delivery + payments tracking', winner: 'tie' },
    { feature: 'Airtime / data PIN dispensing', competitor: 'Not supported', stoki: 'Yes — sell airtime as inventory', winner: 'stoki' },
    { feature: 'Offline support', competitor: 'Cloud-only — no offline', stoki: 'Offline-first PWA — sales queue during load-shedding', winner: 'stoki' },
    { feature: 'Third-party integrations', competitor: 'Hundreds (Shopify, WooCommerce, Stripe, banks, etc.)', stoki: 'Limited — Meta WhatsApp, Ozow, Sentry, Vercel', winner: 'competitor' },
    { feature: 'Multi-currency', competitor: 'Yes (higher tiers)', stoki: 'ZAR only — SA-focused product', winner: 'competitor' },
    { feature: 'AI voice adapts to owner', competitor: 'N/A', stoki: 'Kasi · Plain · Professional · Technical — one setting', winner: 'stoki' },
    { feature: 'SA market context', competitor: 'Global product with SA localisation add-on', stoki: 'Built for SA — SASSA, load-shedding, kasi', winner: 'stoki' },
  ],
  chooseCompetitor: [
    'Your accountant runs your books and they prefer Xero (most SA accountants do).',
    'You need formal double-entry accounting — journals, trial balance, general ledger, audit trail for a lender or auditor.',
    'You need native bank feed automation from FNB, Capitec, Standard, ABSA, Nedbank, Investec, TymeBank, or RMB today.',
    'You transact in multiple currencies (imports, exports, foreign customers).',
    'You need to integrate with a wide ecosystem of third-party tools (Shopify, WooCommerce, expense-management apps, project-management apps).',
    'You have complex advisory needs a Xero-certified accountant handles for you monthly.',
  ],
  chooseStoki: [
    'You run the business yourself and want one app instead of Xero + a POS + a payroll add-on + a card reader.',
    'You want a POS (till) built into the same app that does your books — Xero has no native POS.',
    'You want SA compliance (VAT201, PAYE/UIF/SDL, EMP201) built in, not sold as an add-on.',
    'You want a credit book for informal debtors — the kind of customer who says "I\'ll pay on Friday" — that Xero doesn\'t model.',
    'You want an AI advisor that speaks plain English about your business and the SA economy.',
    'You want a WhatsApp bot to sell, log expenses, and get answers.',
    'You want to keep working during load-shedding — Xero is cloud-only and needs Wi-Fi.',
    'You want one R99-R249/month bill for the whole business, instead of a Xero subscription plus a POS plus a payroll add-on.',
    'You sell airtime / data / bundles as inventory items.',
  ],
  runBoth:
    'Yes — this is a valid setup for businesses that have a Xero-based accountant relationship but want a better daily-operations tool. <strong>Stoki for daily operations</strong> (till, credit book, WhatsApp orders, expenses via receipt photos, AI advisor). <strong>Xero for the formal accountant view</strong> (bank feeds, GL, month-end close). Export from Stoki monthly (CSV or the coming accountant pack) and your accountant reconciles in Xero.',
  pricingIntro:
    'Xero prices in ZAR but is a global product; Stoki is priced for SA SMMEs first. Xero restructured its plans in 2026 (Ignite / Grow / Comprehensive / Ultimate) and changes rand pricing periodically — check xero.com/za for their current figures. Stoki\'s pricing is below, in full.',
  pricingBullets: [
    { label: 'Xero Ignite', body: 'entry plan — capped invoices, bills, and users. Bank reconciliation included. No free tier: you pay from day one.' },
    { label: 'Xero Grow', body: 'unlimited invoices, bills, and users. SA payroll still requires a SimplePay add-on (extra cost).' },
    { label: 'Xero Comprehensive / Ultimate', body: 'multi-currency, projects, and expense claims added; still needs SimplePay for SA payroll.' },
    { label: 'Stoki Free', body: 'free forever for your first store — POS, inventory, credit book, VAT201 export, basic reports.' },
    { label: 'Stoki Pro — R99/mo', body: 'B2B invoicing, payables, bank reconciliation, unlimited AI advisor, accounting exports.' },
    { label: 'Stoki Business — R249/mo', body: 'everything in Pro plus payroll (PAYE/UIF/SDL/EMP201), multi-store, team, WhatsApp broadcasts.' },
  ],
  faqs: [
    { q: 'Is Stoki a Xero alternative for South Africa?', a: 'Yes — for owner-run SMMEs. Stoki is designed to replace Xero for South African small businesses that don\'t need formal double-entry accounting or an accountant-managed workflow. It\'s cheaper, includes POS + payroll + credit book natively (Xero doesn\'t), and adds a WhatsApp bot + AI advisor Xero doesn\'t have. If your accountant runs everything and prefers Xero, keep Xero. If you run the books yourself, Stoki is likely a better fit at a fraction of the cost.' },
    { q: 'Should I move from Xero to Stoki?', a: 'Only if your accountant is open to it or you\'re self-managing your books. Stoki is not a drop-in Xero replacement for accountant-managed businesses that need journal entries, TB, GL, and formal audit trails. It IS a good replacement for owner-managed SMMEs that just need VAT201, PAYE, invoicing, POS, and expense tracking — cheaper and easier.' },
    { q: 'Can Stoki do everything Xero does?', a: 'No — and honestly, no small business needs everything Xero does. Xero\'s formal accounting depth (journals, trial balance, general ledger, audit trail) is powerful for accountants but overkill for a spaza / food stall / salon / trader. Stoki focuses on the 80% of accounting most SMMEs actually need — VAT201, PAYE, invoicing, expense tracking, cash flow — and adds a POS, credit book, and AI advisor Xero doesn\'t have.' },
    { q: 'Does Xero have a POS in South Africa?', a: 'Not natively. Xero integrates with third-party POS providers (Vend / Lightspeed, Shopify POS, etc.) but you have to subscribe to and configure that separately. Stoki has a POS built in — one login, one app, one bill.' },
    { q: 'Does Stoki have bank feeds like Xero?', a: 'Not natively today — Stoki uses CSV / XLSX import for bank reconciliation. Native bank feeds from SA banks (FNB, Capitec, Standard, ABSA, Nedbank, TymeBank, Investec, RMB) are on the roadmap. If direct bank feed is a hard requirement today, Xero wins.' },
    { q: 'Does my accountant support Stoki?', a: 'Most SA accountants use Xero, Sage, QuickBooks, or Pastel. Stoki exports data in CSV / XLSX / PDF that any accountant can import into whatever they use — VAT201 workings, expense ledger, sales journal, payroll summary. An accountant-collaboration mode (read-only invite + comment threads) is on the roadmap.' },
    { q: 'What\'s the price difference between Stoki and Xero?', a: 'Stoki Pro is R99/month and Stoki Business is R249/month — and Stoki Free is free forever for your first store. Xero has no free tier, so you pay from day one, and its entry plan costs several times Stoki Pro. Xero restructured its plans in 2026 (Ignite / Grow / Comprehensive / Ultimate) and adjusts rand pricing periodically, so check xero.com/za for their current SA figures rather than trusting a number on a competitor\'s page — including ours.' },
    { q: 'Can I run Stoki AND Xero together?', a: 'Yes. A common setup: Stoki for daily operations (till, credit book, WhatsApp, expenses, AI advisor), Xero for the accountant\'s monthly view (bank reconciliation, GL, formal reporting). Export from Stoki monthly and your accountant reconciles it in Xero. You get Stoki\'s convenience daily and Xero\'s formal accounting for the accountant relationship.' },
  ],
}

export const metadata = buildComparisonMetadata(data)
export default function Page() { return <ComparisonPage data={data} /> }
