import ComparisonPage, {
  buildComparisonMetadata,
  type ComparisonPageData,
} from '@/components/compare/ComparisonPage'

/**
 * SEO anchor page for "Stoki vs Yoco" and adjacent queries
 * (Yoco alternative SA, Yoco Business review, best POS with card reader
 * South Africa).
 *
 * Positioning: Yoco is a SA-native payment processor + POS + light-books
 * with a physical-distribution moat (card readers in Pep, PnP, Makro).
 * Stoki is the ERP layer that lives on top OR alongside Yoco — we do not
 * compete on card acceptance and say so honestly.
 */

const data: ComparisonPageData = {
  slug: 'stoki-vs-yoco',
  competitor: 'Yoco',
  updated: '2026-07-18',
  title: 'Stoki vs Yoco — SA POS and Business App Compared (2026)',
  description:
    'Honest 2026 comparison of Stoki and Yoco for South African small businesses. Card acceptance, POS, credit book, VAT201, payroll, AI advisor, WhatsApp — side-by-side.',
  ogDescription:
    'Yoco has the card reader. Stoki has the AI, WhatsApp bot, credit book, VAT201 and payroll. Honest comparison for SA small businesses.',
  headline: 'Stoki vs Yoco — SA POS and business app compared',
  intro:
    "Yoco is a South African fintech built around card acceptance; Stoki is the AI-powered operating system for the whole business. Written by Stoki — we don't process card payments and say so up front. Every place Yoco wins is called out as clearly as the reverse.",
  tldr: [
    'Yoco wins for card acceptance. If you need to take card payments in person or via a payment link, Yoco\'s reader, app, and lending arm (Yoco Capital) are unmatched in SA.',
    'Stoki wins for everything after the sale. VAT201, PAYE/UIF/SDL payroll, credit book for informal debtors, AI advisor grounded in SA economics, WhatsApp bot, airtime dispensing, offline PWA — Yoco has none of these.',
    'The best setup for most SA SMMEs is both. Yoco for card acceptance and lending, Stoki for the books, compliance, and AI advisor. They compose cleanly.',
  ],
  rows: [
    { feature: 'Card acceptance (in-person)', competitor: 'Yes — Yoco Neo / Go readers', stoki: 'Not offered — Stoki records but does not process cards', winner: 'competitor' },
    { feature: 'Card acceptance (online payment links)', competitor: 'Yes — Yoco Link', stoki: 'Not offered', winner: 'competitor' },
    { feature: 'POS / till', competitor: 'Solid POS bundled with reader', stoki: 'Full POS with VAT receipts, weighables, airtime, returns', winner: 'tie' },
    { feature: 'Inventory management', competitor: 'Basic — SKUs, prices, stock counts', stoki: 'Full — categories, wastage, expiry alerts, stocktake, POs', winner: 'stoki' },
    { feature: 'Credit book (informal debtors)', competitor: 'Not supported', stoki: 'Native — track debt, WhatsApp reminders, aging report', winner: 'stoki' },
    { feature: 'Airtime / data PIN dispensing', competitor: 'Not supported', stoki: 'Yes — sell airtime as inventory, dispense vouchers', winner: 'stoki' },
    { feature: 'B2B invoicing', competitor: 'Basic invoicing / paylinks', stoki: 'Full B2B invoicing with WhatsApp / email / PDF delivery', winner: 'stoki' },
    { feature: 'SA VAT201', competitor: 'Not supported natively', stoki: 'Native — auto-generated block 1-15 export', winner: 'stoki' },
    { feature: 'PAYE / UIF / SDL', competitor: 'Not supported', stoki: 'Native — EMP201 export, payslips per employee', winner: 'stoki' },
    { feature: 'Payroll', competitor: 'Not supported', stoki: 'Native — employees, contractors, deductions', winner: 'stoki' },
    { feature: 'AI business advisor', competitor: 'Not supported', stoki: 'Grounded in your data + SA economy (SARB, fuel, SARS)', winner: 'stoki' },
    { feature: 'WhatsApp bot', competitor: 'Not supported', stoki: 'Record sales, ask questions, get answers on WhatsApp', winner: 'stoki' },
    { feature: 'Business loans / capital', competitor: 'Yes — Yoco Capital, based on card takings', stoki: 'Not offered — signposts SEFA / NYDA / NEF via AI advisor', winner: 'competitor' },
    { feature: 'Offline support', competitor: 'Some offline in-app', stoki: 'Offline-first PWA — sales queue during load-shedding', winner: 'stoki' },
    { feature: 'Multi-store', competitor: 'Yes on Business plan', stoki: 'Yes on all tiers — separate ai_tone / VAT per store', winner: 'stoki' },
    { feature: 'Cost / margin tracking', competitor: 'Limited', stoki: 'Yes — with AI margin-erosion alerts', winner: 'stoki' },
    { feature: 'AI voice adapts to owner', competitor: 'N/A', stoki: 'Kasi · Plain · Professional · Technical — one setting', winner: 'stoki' },
    { feature: 'Language support', competitor: 'English focus', stoki: 'English + Zulu, Xhosa, Sotho, Afrikaans (rolling)', winner: 'stoki' },
    { feature: 'Distribution', competitor: 'Wide — readers in Pep, PnP, Makro; hardware bundle', stoki: 'Digital-first — sign up, use on any phone', winner: 'competitor' },
    { feature: 'Pricing model', competitor: 'Card fees per transaction + monthly plan for Business', stoki: 'Free first store · Pro/Business subscription (ZAR)', winner: 'tie' },
  ],
  chooseCompetitor: [
    'You need in-person card acceptance today — a physical reader for tap / chip / swipe.',
    'You want an online payment link to send to customers via WhatsApp / email / QR.',
    'You want short-term business finance based on your card takings — Yoco Capital.',
    'Your business is card-heavy and cash-light (formal retail, restaurants with card-preferring customers).',
    'You want one company as both your payment processor AND your card hardware supplier.',
  ],
  chooseStoki: [
    'You already have a payment provider (Yoco, iKhokha, SnapScan, PayFast, Peach) and need the ERP layer on top — books, VAT, payroll, AI, WhatsApp.',
    'You need SARS compliance built in — VAT201, PAYE, UIF, SDL, EMP201.',
    'You give store credit to regulars and need a credit book with WhatsApp reminders.',
    'You want an AI advisor that answers "how is business?" grounded in your numbers plus SA economic context.',
    'You want to run your business from WhatsApp.',
    'You sell airtime / data / bundles as inventory.',
    'You want a product that adapts its voice — from kasi vibe to full accounting terminology.',
    'You take mostly cash / EFT and don\'t need a card reader.',
  ],
  runBoth:
    'This is the common SA setup and what we recommend. <strong>Yoco at the till for card acceptance</strong> (the reader, the online paylink, the Capital lending), <strong>Stoki for everything else</strong> — inventory, credit book, VAT201, payroll, AI advisor, WhatsApp bot, invoices. Export your Yoco daily total into Stoki as a single summary line at cash-up, and your books stay clean.',
  pricingIntro:
    'The two products have fundamentally different pricing models — Yoco monetises card volume, Stoki monetises features. Direct comparison is misleading.',
  pricingBullets: [
    { label: 'Yoco', body: 'Card fees per transaction (typically 2.6% + VAT for card-present, higher for online). Yoco Business plan for advanced features. Reader hardware ~R499-R1,499 upfront.' },
    { label: 'Stoki', body: 'Free forever for your first store. Pro tier for payroll, invoicing, VAT201, and AI advisor. 120-day Business trial for every new account. All ZAR — no forex fees.' },
  ],
  faqs: [
    { q: 'Can Stoki process card payments like Yoco?', a: 'No. Stoki does not process cards and does not compete with Yoco on payment acceptance. If you need in-person card payments or an online payment link, use Yoco (or iKhokha, SnapScan, PayFast, Peach). Stoki records the sale after the payment is taken — via the till, via credit, or via cash.' },
    { q: 'Should I move from Yoco Business to Stoki?', a: 'Probably no — keep Yoco for card acceptance and the reader. Add Stoki alongside for the ERP layer (books, credit book, VAT201, payroll, AI advisor) that Yoco Business doesn\'t cover. Best of both worlds without giving up the card reader you rely on.' },
    { q: 'Do I need a Yoco reader to use Stoki?', a: 'No. Stoki works with any payment method — cash, card, EFT, credit, snapscan. It doesn\'t require any specific hardware. If you take cards via Yoco, iKhokha, SnapScan, or another provider, Stoki records the sale and payment method against your ledger.' },
    { q: 'Does Yoco do VAT201 or PAYE for South Africa?', a: 'Not directly. Yoco reports card takings and expenses via their app, but VAT201 and EMP201 must be generated separately — typically by an accountant, or in Stoki. Stoki\'s VAT201 export follows SARS block 1-15 layout and can be filed via eFiling with no manual re-keying.' },
    { q: 'Does Yoco have an AI advisor?', a: 'No. Yoco has reports and analytics but no AI advisor. Stoki has an AI business advisor grounded in your store data plus SA-specific economic context (SARB rates, fuel prices, SARS deadlines, load-shedding, seasonal patterns).' },
    { q: 'Is Yoco Capital a better funding source than my bank?', a: 'Depends. Yoco Capital lends against your card volume, so it\'s fast for card-heavy businesses and skips traditional credit checks. Downside: cost of capital is typically higher than a bank overdraft or SEFA loan. Stoki\'s AI advisor can walk you through SEFA / NYDA / NEF alternatives if you prefer public-sector funding.' },
    { q: 'Which is better for a spaza shop?', a: 'Stoki, in most cases. Spaza economics are cash-heavy with credit customers — you don\'t need Yoco\'s card reader as your primary need. Stoki\'s credit book, airtime dispensing, and WhatsApp bot are much more valuable for a spaza than Yoco\'s POS. If you want to accept cards too, run both — Yoco at the till, Stoki for everything else.' },
    { q: 'Which is better for a food stall / market trader?', a: 'Depends on your customer mix. If most customers pay cash, use Stoki. If you want tap-to-pay for card customers (increasingly common at markets), use both — Yoco reader for cards, Stoki for the till, inventory, and books.' },
  ],
}

export const metadata = buildComparisonMetadata(data)
export default function Page() { return <ComparisonPage data={data} /> }
