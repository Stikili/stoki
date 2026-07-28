import ComparisonPage, {
  buildComparisonMetadata,
  type ComparisonPageData,
} from '@/components/compare/ComparisonPage'

/**
 * SEO anchor for "Stoki vs Zoho Books" and adjacent queries
 * (Zoho Books alternative South Africa, cheap SA accounting).
 *
 * Zoho Books is aggressive on price globally and has a growing SA
 * presence, but SA compliance (VAT201 / PAYE / EMP201) is thin and
 * SA bank feeds are limited. Stoki wins on SA-nativeness + integrated
 * POS + credit book + AI + WhatsApp; Zoho wins on Zoho-ecosystem
 * integrations (CRM, Inventory, Mail).
 */

const data: ComparisonPageData = {
  slug: 'stoki-vs-zoho-books',
  competitor: 'Zoho Books',
  updated: '2026-07-19',
  title: 'Stoki vs Zoho Books — SA Small Business Accounting Compared',
  description:
    'Honest 2026 comparison of Stoki and Zoho Books for South African SMMEs. Price, SA compliance (VAT201, PAYE), POS, credit book, AI advisor, WhatsApp, offline — side-by-side.',
  ogDescription:
    "Zoho Books is cheap and has a huge integration ecosystem. Stoki is SA-native with POS, credit book, and AI built in. Honest comparison for SA SMMEs.",
  headline: 'Stoki vs Zoho Books — global accounting vs SA-native business OS',
  intro:
    "Zoho Books is a global cloud-accounting product with an aggressive price point and a huge ecosystem of Zoho apps (CRM, Inventory, Mail, Desk) that plug into it. Stoki is a SA-native business operating system that includes accounting as one module alongside POS, credit book, invoicing, payroll, and an AI advisor. Written by Stoki — honest about where Zoho's ecosystem breadth wins vs where Stoki's SA-focus wins.",
  tldr: [
    'Zoho Books wins for businesses already using the Zoho ecosystem (CRM, Inventory, Mail) or for accountants managing several small clients who need cheap cloud accounting with formal double-entry depth.',
    'Stoki wins for SA SMMEs that also need POS, credit book, VAT201, PAYE/UIF/SDL, WhatsApp, AI advisor, offline mode — all in one app, SA-native, informal-trader friendly.',
    'The "run both" story is thin: both include accounting. If a business needs Zoho\'s CRM specifically, use Zoho for CRM + accounting and Stoki for POS + credit book + AI. But it\'s a heavy setup.',
  ],
  rows: [
    { feature: 'Entry price (ZAR-equivalent)', competitor: '~R80/mo (Standard) globally competitive', stoki: 'Free forever for first store', winner: 'stoki' },
    { feature: 'Mid tier price', competitor: '~R160/mo (Professional)', stoki: 'Pro R99/mo — cheaper than Zoho at the tier that includes real features', winner: 'stoki' },
    { feature: 'SA VAT201', competitor: 'Basic VAT reporting; not SARS block-by-block', stoki: 'Native — auto-generated block 1-15 export', winner: 'stoki' },
    { feature: 'PAYE / UIF / SDL / EMP201', competitor: 'Zoho Payroll is separate + limited in SA', stoki: 'Native — EMP201 export in Business tier', winner: 'stoki' },
    { feature: 'Point of sale (till)', competitor: 'Not offered — requires third-party POS integration', stoki: 'Full POS with VAT receipts, weighables, airtime, credit', winner: 'stoki' },
    { feature: 'Inventory', competitor: 'Zoho Inventory is a separate product (extra cost)', stoki: 'Full inventory built in — categories, wastage, expiry, stocktake, POs', winner: 'stoki' },
    { feature: 'Credit book (informal debtors)', competitor: 'Contacts + invoices — no informal-debtor flow', stoki: 'Native — WhatsApp reminders, aging report, kasi-friendly', winner: 'stoki' },
    { feature: 'B2B invoicing', competitor: 'Excellent — Zoho\'s core strength (recurring, quotes, credit notes)', stoki: 'PDF invoices + WhatsApp/email delivery + payment tracking', winner: 'tie' },
    { feature: 'Bank feeds (SA banks)', competitor: 'Limited SA bank feed coverage', stoki: 'CSV import today; native feeds coming', winner: 'tie' },
    { feature: 'Formal accounting (GL, TB, journal entries)', competitor: 'Deep — full double-entry, TB, GL, BS, IS', stoki: 'Focused on SMME reporting, not formal double-entry', winner: 'competitor' },
    { feature: 'AI business advisor', competitor: 'Zia AI in Zoho — general assistant, not SA-specific', stoki: 'Native — grounded in your data + SA economy (SARB, fuel, SARS)', winner: 'stoki' },
    { feature: 'WhatsApp bot', competitor: 'Not native', stoki: 'Record sales, ask questions, get answers on WhatsApp', winner: 'stoki' },
    { feature: 'Offline support', competitor: 'Cloud-only', stoki: 'Offline-first PWA — sales queue during load-shedding', winner: 'stoki' },
    { feature: 'AI voice adapts to owner', competitor: 'N/A', stoki: 'Kasi / Plain / Professional / Technical', winner: 'stoki' },
    { feature: 'Ecosystem integrations', competitor: 'Massive — Zoho CRM, Inventory, Mail, Desk, 40+ Zoho apps', stoki: 'Limited — Meta WhatsApp, Ozow, Sentry', winner: 'competitor' },
    { feature: 'Multi-currency', competitor: 'Yes (Standard tier and above)', stoki: 'ZAR only — SA-focused product', winner: 'competitor' },
    { feature: 'SA market context', competitor: 'Global platform; SA is one of many localisations', stoki: 'Built for SA — SASSA, load-shedding, kasi', winner: 'stoki' },
    { feature: 'Accountant ecosystem in SA', competitor: 'Growing but smaller than Xero / Sage in SA', stoki: 'Accountant collab mode coming; export packs available', winner: 'competitor' },
    { feature: 'Airtime PIN dispensing', competitor: 'Not offered', stoki: 'Yes — sell airtime as inventory, dispense vouchers', winner: 'stoki' },
    { feature: 'Language support', competitor: 'English + global languages', stoki: 'English + Zulu / Xhosa / Sotho / Afrikaans (rolling)', winner: 'stoki' },
  ],
  chooseCompetitor: [
    'You already use Zoho CRM / Inventory / Mail and want tight integration with the same accounting product.',
    'You need deep formal accounting: journal entries, TB, GL, custom chart-of-accounts, multi-currency.',
    'Your accountant is Zoho-certified and manages your books there.',
    'You need excellent recurring invoicing + quotes + credit-note workflows (Zoho\'s core strength).',
    'You have global / cross-currency customers.',
    'You don\'t need POS, credit book, or WhatsApp — pure back-office accounting is your focus.',
  ],
  chooseStoki: [
    'You run a SA small business and want POS + inventory + credit book + VAT201 + payroll + AI advisor in the same app.',
    'You want SA compliance (VAT201, PAYE/UIF/SDL, EMP201) native, not as an add-on.',
    'You want a credit book for informal debtors — the "pay Friday" customer Zoho doesn\'t model.',
    'You want an AI advisor grounded in the SA economy.',
    'You want to run your business from WhatsApp.',
    'You want to keep trading during load-shedding — Zoho is cloud-only.',
    'You sell airtime / data / bundles as inventory.',
    'You don\'t need multi-currency (95% of SA SMMEs are ZAR-only anyway).',
  ],
  runBoth:
    'Uncommon but valid if you specifically want Zoho CRM. Common shape: <strong>Zoho CRM for pipeline management</strong>, <strong>Stoki for POS + credit book + VAT201 + payroll + AI advisor</strong>. You lose Zoho Books\' formal accounting depth this way, but for most SA SMMEs Stoki\'s reporting is enough. Alternative: use Zoho for the whole back-office and only add Stoki when you specifically need the POS / credit book / WhatsApp / AI features — then run them as a "front-of-house" layer on top.',
  pricingIntro:
    'Both offer competitive pricing. Zoho\'s low entry cost is aggressive globally; Stoki\'s Free tier + R99 Pro is cheaper and includes more (POS + credit book + AI advisor).',
  pricingBullets: [
    { label: 'Zoho Books Standard', body: 'around R80/mo — basic accounting + invoicing, limited SA payroll (Zoho Payroll is separate).' },
    { label: 'Zoho Books Professional', body: 'around R160/mo — recurring invoices, timesheets, projects, inventory light. SA payroll still separate.' },
    { label: 'Stoki Free', body: 'free forever for your first store — POS + inventory + credit book + VAT201 + AI advisor (20 questions/day).' },
    { label: 'Stoki Pro', body: 'R99/mo — B2B invoicing, bank rec, unlimited AI advisor + 7 Pro insights, accounting exports. Cheaper than Zoho Standard AND includes POS.' },
    { label: 'Stoki Business', body: 'R249/mo — payroll (PAYE/UIF/SDL/EMP201), multi-store, WhatsApp broadcasts, fixed assets. Comparable to Zoho Professional but with SA payroll included.' },
  ],
  faqs: [
    { q: 'Is Stoki a Zoho Books alternative for South Africa?', a: 'Yes — for SA SMMEs. Stoki is SA-native (VAT201, PAYE/UIF/SDL, SA banks, kasi personas) where Zoho Books is a global product with SA localisation as a feature. If you\'re already in the Zoho ecosystem, stick with Zoho Books; if you\'re starting from scratch and want an app built for SA, Stoki is a better fit.' },
    { q: 'Does Zoho Books do SA payroll?', a: 'Not natively — you\'d subscribe to Zoho Payroll separately. Zoho Payroll\'s SA coverage is thinner than SimplePay or Sage Payroll. Stoki includes SA payroll (PAYE/UIF/SDL/EMP201) natively in the Business tier at no extra cost.' },
    { q: 'Should I move from Zoho Books to Stoki?', a: 'Only if you\'re not deep in the Zoho ecosystem and you want more than just accounting (POS, credit book, WhatsApp, AI). If you rely on Zoho CRM / Inventory / Mail, the integration lock-in makes moving painful — consider running both.' },
    { q: 'Should I move from Stoki to Zoho Books?', a: 'Only if you need multi-currency, formal double-entry accounting depth (Zoho\'s stronger here), or you\'re about to onboard a Zoho-certified accountant. Otherwise Stoki\'s SA-native compliance + free tier keeps costs down and functionality broader.' },
    { q: 'Which is better for a spaza shop?', a: 'Stoki, comfortably. Zoho Books is designed for formal accounting-first businesses; a spaza needs POS + credit book + airtime PINs + WhatsApp — all native in Stoki, none in Zoho Books.' },
    { q: 'Does Zoho Books have a POS?', a: 'Not natively. You\'d integrate a third-party POS (Vend, Square, Shopify POS) and reconcile the sales into Zoho Books. Stoki has a POS built into the same app as accounting.' },
    { q: 'Can I run Zoho Books + Stoki together?', a: 'Yes if you want Zoho CRM specifically — use Zoho for pipeline management, Stoki for POS + till + credit book + WhatsApp + AI. Export from Stoki to Zoho monthly to keep the formal books in Zoho.' },
    { q: 'What\'s Zia (Zoho AI) vs Stoki AI?', a: 'Zia is Zoho\'s general-purpose assistant — helpful for Zoho product navigation and light analytics. Stoki AI is SA-economy-aware and grounded in your business data specifically — answers "how is business today?" with SARB rates, fuel context, and your own numbers. Different tools for different jobs.' },
  ],
}

export const metadata = buildComparisonMetadata(data)
export default function Page() { return <ComparisonPage data={data} /> }
