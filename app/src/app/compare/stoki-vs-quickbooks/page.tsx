import ComparisonPage, {
  buildComparisonMetadata,
  type ComparisonPageData,
} from '@/components/compare/ComparisonPage'

/**
 * SEO anchor for "Stoki vs QuickBooks" and adjacent SA queries
 * (QuickBooks SA alternative, QuickBooks Online South Africa).
 *
 * QuickBooks Online has a smaller SA presence than Xero / Sage but
 * some businesses (especially US-connected or export-oriented SMMEs)
 * use it. Positioning: QuickBooks has the global brand + massive
 * feature depth; Stoki has SA-native everything.
 */

const data: ComparisonPageData = {
  slug: 'stoki-vs-quickbooks',
  competitor: 'QuickBooks',
  updated: '2026-07-19',
  title: 'Stoki vs QuickBooks — SA Small Business Accounting Compared',
  description:
    'Honest 2026 comparison of Stoki and QuickBooks Online for South African SMMEs. Price, SA compliance (VAT201, PAYE), POS, credit book, AI, WhatsApp, offline — side-by-side.',
  ogDescription:
    "QuickBooks has global brand + depth. Stoki is SA-native with POS, credit book, AI, and WhatsApp built in. Honest comparison for SA SMMEs.",
  headline: 'Stoki vs QuickBooks — global accounting vs SA-native business OS',
  intro:
    "QuickBooks Online is the global small-business accounting incumbent — massive feature depth, strong US / UK / AU presence, smaller SA footprint. Stoki is a SA-native business operating system that includes accounting as one module alongside POS, credit book, VAT201, payroll, AI advisor, and WhatsApp bot. Written by Stoki — honest about where QuickBooks' global depth wins vs where Stoki's SA-focus wins.",
  tldr: [
    'QuickBooks wins for SA businesses with US / UK / AU customers, complex multi-currency invoicing, or where an existing QuickBooks-familiar accountant runs the books.',
    'Stoki wins for SA-first SMMEs that want SARS-native compliance (VAT201, PAYE/UIF/SDL) + POS + credit book + AI advisor + WhatsApp — all in one app, priced in ZAR without forex fees.',
    'Both do accounting. Stoki does more of the daily operations; QuickBooks does more of the formal accounting depth. Businesses usually pick one.',
  ],
  rows: [
    { feature: 'Entry price (ZAR)', competitor: '~R210/mo (Simple Start), USD-denominated in SA', stoki: 'Free forever for first store', winner: 'stoki' },
    { feature: 'Mid tier price (ZAR)', competitor: '~R330/mo (Essentials)', stoki: 'Pro R99/mo — much cheaper', winner: 'stoki' },
    { feature: 'Advanced tier price', competitor: '~R560/mo (Plus)', stoki: 'Business R249/mo', winner: 'stoki' },
    { feature: 'SA VAT201', competitor: 'Basic VAT reporting; not SARS block-by-block layout', stoki: 'Native — auto-generated block 1-15 export', winner: 'stoki' },
    { feature: 'PAYE / UIF / SDL / EMP201', competitor: 'Not native in QuickBooks SA', stoki: 'Native — EMP201 export in Business tier', winner: 'stoki' },
    { feature: 'Point of sale (till)', competitor: 'Not native (QuickBooks Commerce is a separate product in some regions)', stoki: 'Full POS with VAT receipts, weighables, airtime, credit', winner: 'stoki' },
    { feature: 'Inventory', competitor: 'Yes on Plus tier and above', stoki: 'Full — categories, wastage, expiry, stocktake, POs', winner: 'tie' },
    { feature: 'Credit book (informal debtors)', competitor: 'Contacts + invoices — no informal-debtor flow', stoki: 'Native — WhatsApp reminders, aging report, kasi-friendly', winner: 'stoki' },
    { feature: 'B2B invoicing', competitor: 'Excellent — QuickBooks\' core strength (recurring, quotes, estimates)', stoki: 'PDF invoices + WhatsApp/email delivery + payment tracking', winner: 'competitor' },
    { feature: 'Bank feeds (SA banks)', competitor: 'Limited SA bank feed coverage', stoki: 'CSV import today; native feeds coming', winner: 'tie' },
    { feature: 'Formal accounting (GL, TB, journal entries)', competitor: 'Deep — full double-entry, TB, GL, custom chart-of-accounts', stoki: 'Focused on SMME reporting, not formal double-entry', winner: 'competitor' },
    { feature: 'AI business advisor', competitor: 'QuickBooks AI (Intuit Assist) — general small-business assistant, not SA-specific', stoki: 'Native — grounded in your data + SA economy (SARB, fuel, SARS)', winner: 'stoki' },
    { feature: 'WhatsApp bot', competitor: 'Not supported', stoki: 'Record sales, ask questions, get answers on WhatsApp', winner: 'stoki' },
    { feature: 'Offline support', competitor: 'Cloud-only', stoki: 'Offline-first PWA — sales queue during load-shedding', winner: 'stoki' },
    { feature: 'Multi-currency', competitor: 'Yes (Essentials tier and above) — QuickBooks strength', stoki: 'ZAR only — SA-focused product', winner: 'competitor' },
    { feature: 'US / global tax support', competitor: 'Strong — Intuit\'s home market', stoki: 'SA-only', winner: 'competitor' },
    { feature: 'Third-party integrations', competitor: 'Massive — 750+ QuickBooks App Store apps', stoki: 'Limited — Meta WhatsApp, Ozow, Sentry', winner: 'competitor' },
    { feature: 'Accountant ecosystem in SA', competitor: 'Smaller than Xero / Sage; some SA accountants trained', stoki: 'Accountant collab mode coming; export packs available', winner: 'competitor' },
    { feature: 'Airtime PIN dispensing', competitor: 'Not offered', stoki: 'Yes — sell airtime as inventory', winner: 'stoki' },
    { feature: 'AI voice adapts to owner', competitor: 'N/A', stoki: 'Kasi / Plain / Professional / Technical — one setting', winner: 'stoki' },
    { feature: 'SA market context', competitor: 'Global platform with SA localisation', stoki: 'Built in Cape Town for SA — SASSA, load-shedding, kasi', winner: 'stoki' },
    { feature: 'ZAR pricing (no forex fees)', competitor: 'USD-denominated even when SA-billed; forex fees on cards', stoki: 'ZAR-native via SA payment provider — no forex', winner: 'stoki' },
  ],
  chooseCompetitor: [
    'You have US / UK / AU customers or invoice in multiple currencies (QuickBooks\' multi-currency + FX handling is deeper).',
    'Your accountant is QuickBooks-certified and runs your books.',
    'You need deep formal accounting: journal entries, TB, GL, custom chart-of-accounts, class + location tracking.',
    'You integrate with US-centric tools (Stripe, PayPal, Shopify) that have first-class QuickBooks integrations.',
    'You have export-heavy or foreign-currency-heavy operations.',
    'You need QuickBooks-specific workflows (estimates → invoices → payments with US-style project accounting).',
  ],
  chooseStoki: [
    'You run a SA-focused SMME with mostly ZAR customers.',
    'You want SA compliance (VAT201, PAYE/UIF/SDL, EMP201) native — QuickBooks needs add-ons + workarounds for SA payroll.',
    'You want POS + credit book + inventory + invoicing + payroll + AI in the same app, priced for SA.',
    'You want an AI advisor grounded in the SA economy (SARB, fuel prices, SARS deadlines).',
    'You want to run your business from WhatsApp.',
    'You want ZAR-native pricing with no forex fees.',
    'You sell airtime / data as inventory.',
    'You want to keep trading during load-shedding — QuickBooks is cloud-only.',
  ],
  runBoth:
    'Uncommon. Both include accounting so paying for both means paying for overlap. If you specifically need QuickBooks (US-connected business, QuickBooks-certified accountant, complex multi-currency), use QuickBooks for the books and consider Stoki only if you need SA-specific POS + credit book + AI features on the side — but that\'s a heavy setup for most SMMEs.',
  pricingIntro:
    'QuickBooks pricing in SA is USD-denominated and typically higher than Stoki at every comparable tier. Stoki\'s free tier has no QuickBooks equivalent.',
  pricingBullets: [
    { label: 'QuickBooks Simple Start', body: 'around R210/mo (USD-denominated, ~USD 12). Single-user, basic invoicing + expenses.' },
    { label: 'QuickBooks Essentials', body: 'around R330/mo (~USD 18). Bill management + multi-currency, up to 3 users.' },
    { label: 'QuickBooks Plus', body: 'around R560/mo (~USD 30). Inventory + project tracking + budgets, up to 5 users.' },
    { label: 'Stoki Free', body: 'free forever for your first store — POS + inventory + credit book + VAT201 + AI advisor.' },
    { label: 'Stoki Pro', body: 'R99/mo — B2B invoicing, bank rec, unlimited AI + 7 Pro insights, accounting exports.' },
    { label: 'Stoki Business', body: 'R249/mo — payroll (PAYE/UIF/SDL/EMP201), multi-store, WhatsApp broadcasts, fixed assets.' },
  ],
  faqs: [
    { q: 'Is Stoki a QuickBooks alternative for South Africa?', a: 'Yes — for SA-focused SMMEs. Stoki is SA-native (VAT201, PAYE/UIF/SDL, ZAR pricing, kasi personas) where QuickBooks is a global product optimized for the US market with SA localisation as a feature. If you need QuickBooks specifically (multi-currency, US customers, QuickBooks-certified accountant), stay with QuickBooks. Otherwise Stoki is a better SA fit at a fraction of the price.' },
    { q: 'Does QuickBooks do SA payroll?', a: 'Not natively. You would use a third-party integration (SimplePay, PaySpace) and reconcile monthly. Stoki includes SA payroll (PAYE/UIF/SDL/EMP201) natively in the Business tier at no extra cost.' },
    { q: 'Should I move from QuickBooks to Stoki?', a: 'Only if you don\'t rely on QuickBooks\' multi-currency, formal accounting depth, or US-centric integrations. If you\'re a SA-only SMME using QuickBooks because it\'s the "safe" incumbent, Stoki likely serves you better + cheaper. If you have US customers or a QuickBooks-certified accountant, stay put.' },
    { q: 'Should I move from Stoki to QuickBooks?', a: 'Rare — only if your business has grown into needing multi-currency, complex formal accounting, or is being acquired by a QuickBooks-standardised parent company.' },
    { q: 'Which is better for a spaza shop?', a: 'Stoki, comfortably. QuickBooks is designed for formal-accounting-first businesses; a spaza needs POS + credit book + airtime + WhatsApp — all native in Stoki, none in QuickBooks.' },
    { q: 'Does QuickBooks have a POS in South Africa?', a: 'Not directly. QuickBooks Commerce exists in some regions but SA availability is limited. You\'d typically integrate a third-party POS (Vend, Shopify POS) and sync sales to QuickBooks.' },
    { q: 'What\'s the price difference at each tier?', a: 'QuickBooks is typically 2-3× more expensive at each tier in SA — Simple Start (~R210) vs Stoki Pro (R99), Essentials (~R330) vs Stoki Business (R249), Plus (~R560) vs Stoki Enterprise (from R899 with unlimited stores/employees). Plus you pay QuickBooks in USD (indirectly via forex).' },
    { q: 'Can I run QuickBooks + Stoki together?', a: 'Possible but heavy. Common setup: Stoki for daily till + credit + WhatsApp + AI; QuickBooks for the formal books your accountant runs. Export from Stoki monthly and import into QuickBooks. Most SA SMMEs find one is enough.' },
  ],
}

export const metadata = buildComparisonMetadata(data)
export default function Page() { return <ComparisonPage data={data} /> }
