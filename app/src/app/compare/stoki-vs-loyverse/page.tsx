import ComparisonPage, {
  buildComparisonMetadata,
  type ComparisonPageData,
} from '@/components/compare/ComparisonPage'

/**
 * SEO anchor page for "Stoki vs Loyverse" and adjacent queries
 * (Loyverse alternative SA, best free POS South Africa).
 *
 * All markup + JSON-LD lives in @/components/compare/ComparisonPage.
 * This file is DATA ONLY. When Loyverse ships a feature that closes a
 * gap, edit the row here so we don't misrepresent them — bad-faith
 * comparison pages get de-ranked once flagged.
 */

const data: ComparisonPageData = {
  slug: 'stoki-vs-loyverse',
  competitor: 'Loyverse',
  updated: '2026-07-18',
  title: 'Stoki vs Loyverse — Which POS is Right for Your SA Small Business?',
  description:
    'Honest 2026 comparison of Stoki and Loyverse for South African SMMEs. Pricing, POS features, SA compliance (VAT201, PAYE), AI advisor, WhatsApp, offline — side-by-side.',
  ogDescription:
    'Which free POS is right for your South African shop, service business, or SMME? Detailed comparison of Stoki and Loyverse across pricing, SA compliance, AI, WhatsApp, and offline support.',
  headline: 'Stoki vs Loyverse — which POS is right for your SA small business?',
  intro:
    "Honest 2026 comparison across pricing, SA compliance, POS features, AI, WhatsApp, and offline support. Written by Stoki — we'll flag every place Loyverse wins as clearly as we flag the reverse.",
  tldr: [
    'Loyverse wins for hardware-connected retail (multi-terminal cafés, restaurants with kitchen printers, shops with barcode scanner + cash drawer setups) and for owners who want a battle-tested global POS with a wide ecosystem.',
    'Stoki wins for any SA small business that also needs SARS compliance (VAT201, PAYE/UIF/SDL), a credit book for informal debtors, airtime PIN dispensing, an AI advisor, or a WhatsApp bot — i.e. most South African SMMEs.',
    'Both are free at the entry tier. You can run them side-by-side — Loyverse at the till, Stoki for the books and advisor.',
  ],
  rows: [
    { feature: 'Free tier', competitor: 'Free forever — unlimited items + sales', stoki: 'Free forever for first store · 120-day Business trial', winner: 'tie' },
    { feature: 'Point of sale (till)', competitor: 'Excellent, POS-first product', stoki: 'Full POS with VAT-aware receipts, weighables, airtime', winner: 'tie' },
    { feature: 'Inventory / stock', competitor: 'Strong — categories, variants, stock alerts', stoki: 'Full inventory + wastage + expiry alerts + stocktake', winner: 'tie' },
    { feature: 'SA VAT201 compliance', competitor: 'Not supported', stoki: 'Native — auto-generated block 1-15 export', winner: 'stoki' },
    { feature: 'PAYE / UIF / SDL payroll', competitor: 'Not supported', stoki: 'Native — EMP201 export, payslips', winner: 'stoki' },
    { feature: 'Credit book (informal debtors)', competitor: 'Not supported', stoki: 'Native — track who owes what, WhatsApp reminders', winner: 'stoki' },
    { feature: 'WhatsApp bot', competitor: 'Not supported', stoki: 'Ask questions, log sales, get answers on WhatsApp', winner: 'stoki' },
    { feature: 'AI business advisor', competitor: 'Not supported', stoki: 'Grounded in your data + SA economy (SARB, fuel, SARS)', winner: 'stoki' },
    { feature: 'AI voice adapts to owner', competitor: 'N/A', stoki: 'Kasi · Plain · Professional · Technical — one setting', winner: 'stoki' },
    { feature: 'Airtime PIN dispensing', competitor: 'Not supported', stoki: 'Sell airtime + data as inventory items', winner: 'stoki' },
    { feature: 'B2B invoicing', competitor: 'Not native', stoki: 'PDF invoices + WhatsApp/email delivery', winner: 'stoki' },
    { feature: 'Offline support', competitor: 'Yes (queues + syncs)', stoki: 'Offline-first PWA — sales queue during load-shedding', winner: 'tie' },
    { feature: 'Multi-store', competitor: 'Yes on free tier', stoki: 'Yes — separate ai_tone / VAT status per store', winner: 'tie' },
    { feature: 'Hardware ecosystem', competitor: 'Wide — many printers, scanners, cash drawers', stoki: 'Bluetooth thermal printer + phone camera scanner', winner: 'competitor' },
    { feature: 'SA market context', competitor: 'Global product — no SA specificity', stoki: 'Built for SA — SASSA, load-shedding, kasi', winner: 'stoki' },
    { feature: 'Pricing (paid tier)', competitor: 'Employee mgmt + kitchen printing extras ~USD/month', stoki: 'ZAR pricing, SA billing (Ozow), no forex fees', winner: 'stoki' },
    { feature: 'Cost of goods / margin tracking', competitor: 'Yes', stoki: 'Yes — plus AI margin-erosion alerts', winner: 'stoki' },
    { feature: 'Language support', competitor: 'English + global languages', stoki: 'English + Zulu, Xhosa, Sotho, Afrikaans (rolling)', winner: 'tie' },
  ],
  chooseCompetitor: [
    'Your primary need is a rock-solid POS with a wide hardware ecosystem (barcode scanners, cash drawers, receipt printers, kitchen printers, customer displays).',
    'You run a restaurant / café with kitchen ticket routing and multi-terminal service.',
    "You don't need SA-specific tax reporting (you handle VAT201 / PAYE elsewhere with an accountant, Xero, or Stoki).",
    "You don't give store credit to informal customers.",
    'You prefer a global product with English-speaking support and a large community.',
  ],
  chooseStoki: [
    'You run a South African small business — spaza, food stall, salon, transport operator, mobile trader, general dealer, contractor, or a growing formal SMME.',
    'You need SARS compliance built in — VAT201 export, PAYE / UIF / SDL, EMP201.',
    'You give store credit to regulars and need a credit book that WhatsApps reminders to debtors.',
    'You want an AI advisor that knows the SA economy (SARB rates, fuel prices, SARS deadlines, load-shedding) and grounds every answer in your numbers.',
    'You want to run your business from WhatsApp — record sales, ask questions, get answers.',
    'You sell airtime / data as inventory items.',
    'You want a product that adapts its voice to how you talk (kasi, plain, professional, or technical accounting).',
    'You want SA billing (ZAR, Ozow) rather than USD forex fees.',
  ],
  runBoth:
    'You don&apos;t have to pick. A common SA setup: <strong>Loyverse at the till</strong> (for the hardware ecosystem and multi-terminal café workflow), <strong>Stoki for the books, VAT, payroll, credit book, and AI advisor</strong>. Export your daily sales from Loyverse and log them in Stoki as a summary line — you get the best of both without switching hardware.',
  pricingIntro:
    'Both Loyverse and Stoki offer a genuinely free tier with unlimited sales — you can run either without paying anything ever. Differences appear in the paid tiers:',
  pricingBullets: [
    { label: 'Loyverse', body: 'free POS + inventory. Paid add-ons (employee management, kitchen printing, advanced inventory) billed in USD — around US$5-25 per store per month, incurring forex fees on SA bank cards.' },
    { label: 'Stoki', body: 'free forever for your first store. 120-day Business trial for every new account. Pro / Business tiers billed in ZAR via Ozow (no forex fees). Payroll, invoicing, VAT201, and the AI advisor unlock at Pro.' },
  ],
  faqs: [
    { q: 'Is Loyverse free in South Africa?', a: 'Yes. Loyverse\'s POS + inventory apps are free forever, including on the SA App Store and Play Store. Paid add-ons (employee management, kitchen printing) are billed in US dollars.' },
    { q: 'Is Stoki free in South Africa?', a: 'Yes. Stoki is free forever for your first store, with a 120-day Business trial that unlocks payroll, multi-store, and advanced AI features for every new account.' },
    { q: 'Which is better for a spaza shop — Stoki or Loyverse?', a: 'Stoki. Loyverse is a well-built global POS but has no credit book (informal debtors), no airtime PIN dispensing, no VAT201, no SARS/PAYE support, and no WhatsApp bot — all critical for SA township traders. Loyverse wins if your only need is a POS + inventory and hardware compatibility.' },
    { q: 'Does Loyverse support VAT201 or PAYE for South Africa?', a: 'No. Loyverse is a global product and does not generate SARS-compliant VAT201 or EMP201 reports. If you are VAT-registered or employ staff in SA, you would need a second tool (Xero, Sage, or Stoki) for compliance.' },
    { q: 'Can Loyverse work on WhatsApp?', a: 'No. Loyverse has no WhatsApp integration. Stoki has a WhatsApp bot that lets you record sales, ask about your business, and get AI answers grounded in your data — right from WhatsApp.' },
    { q: 'Does Loyverse have an AI advisor?', a: 'No. Loyverse is a traditional POS + inventory product with reporting. Stoki has an AI business advisor grounded in your store\'s data plus SA-specific economic context (SARB rates, fuel prices, SARS deadlines, load-shedding).' },
    { q: 'Should I migrate from Loyverse to Stoki?', a: 'If your only need is a POS and Loyverse is working for you, keep it — no need to switch. Consider Stoki when you need SA compliance (VAT201, PAYE), a credit book for informal debtors, an AI advisor, or WhatsApp integration. You can also run both — Loyverse at the till, Stoki for the books and advisor — and export sales between them.' },
    { q: 'Can I try Stoki without leaving Loyverse?', a: 'Yes. Stoki is free for your first store and does not need any hardware. You can trial it as a companion to your existing Loyverse setup — use Stoki for VAT201, payroll, and the AI advisor while keeping Loyverse at the till.' },
  ],
}

export const metadata = buildComparisonMetadata(data)
export default function Page() { return <ComparisonPage data={data} /> }
