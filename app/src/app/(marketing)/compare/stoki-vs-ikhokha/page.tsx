import ComparisonPage, {
  buildComparisonMetadata,
  type ComparisonPageData,
} from '@/components/compare/ComparisonPage'

/**
 * SEO anchor page for "Stoki vs iKhokha" and adjacent SA-search queries
 * (iKhokha alternative, iKhokha Books review, best SA card reader).
 *
 * iKhokha mirrors Yoco's positioning almost exactly: SA-native payment
 * processor with retail-hardware distribution moat (Solo, Kazang) +
 * light POS + iKhokha Books bookkeeping bolt-on + iKhokha Cash Advance
 * lending. Stoki doesn't compete on card acceptance and says so.
 * Recommended setup: run both — iKhokha for cards, Stoki for the ERP.
 */

const data: ComparisonPageData = {
  slug: 'stoki-vs-ikhokha',
  competitor: 'iKhokha',
  updated: '2026-07-19',
  title: 'Stoki vs iKhokha — SA POS, Card Reader and Books Compared',
  description:
    'Honest 2026 comparison of Stoki and iKhokha for South African SMMEs. Card acceptance, POS, credit book, VAT201, payroll, AI advisor, WhatsApp — side-by-side.',
  ogDescription:
    'iKhokha has the card reader. Stoki has the AI, WhatsApp bot, credit book, VAT201, and payroll. Honest comparison for SA SMMEs.',
  headline: 'Stoki vs iKhokha — SA POS, card reader, and books compared',
  intro:
    "iKhokha is a South African fintech built around card acceptance and merchant lending; Stoki is the AI-powered operating system for the whole business. Written by Stoki — we don't process card payments and say so up front. Every place iKhokha wins is called out as clearly as the reverse.",
  tldr: [
    'iKhokha wins for card acceptance. If you need to take card payments in-person or via a paylink, iKhokha\'s Solo / Kazang readers, app, and lending arm (iKhokha Cash Advance) are competitive with Yoco.',
    'Stoki wins for everything after the sale. VAT201, PAYE/UIF/SDL payroll, credit book for informal debtors, AI advisor grounded in SA economics, WhatsApp bot, airtime dispensing, offline PWA — iKhokha Books has none of these.',
    'The best setup for most SA SMMEs is both. iKhokha for card acceptance and Cash Advance, Stoki for the books, compliance, and AI advisor.',
  ],
  rows: [
    { feature: 'Card acceptance (in-person)', competitor: 'Yes — iKhokha Solo / Kazang readers', stoki: 'Not offered — Stoki records but does not process cards', winner: 'competitor' },
    { feature: 'Card acceptance (online paylinks)', competitor: 'Yes — iKhokha PayLinks', stoki: 'Not offered', winner: 'competitor' },
    { feature: 'POS / till', competitor: 'Solid POS bundled with reader', stoki: 'Full POS with VAT receipts, weighables, airtime, returns', winner: 'tie' },
    { feature: 'Inventory management', competitor: 'Basic — SKUs, prices, stock counts', stoki: 'Full — categories, wastage, expiry alerts, stocktake, POs', winner: 'stoki' },
    { feature: 'Credit book (informal debtors)', competitor: 'Not supported', stoki: 'Native — track debt, WhatsApp reminders, aging report', winner: 'stoki' },
    { feature: 'Airtime / data PIN dispensing', competitor: 'Yes — via Kazang integration', stoki: 'Yes — sell airtime as inventory, dispense vouchers', winner: 'tie' },
    { feature: 'B2B invoicing', competitor: 'Basic invoicing / paylinks', stoki: 'Full B2B invoicing with WhatsApp / email / PDF delivery', winner: 'stoki' },
    { feature: 'SA VAT201', competitor: 'Not supported', stoki: 'Native — auto-generated block 1-15 export', winner: 'stoki' },
    { feature: 'PAYE / UIF / SDL', competitor: 'Not supported', stoki: 'Native — EMP201 export, payslips per employee', winner: 'stoki' },
    { feature: 'Payroll', competitor: 'Not supported', stoki: 'Native — employees, contractors, deductions', winner: 'stoki' },
    { feature: 'AI business advisor', competitor: 'Not supported', stoki: 'Grounded in your data + SA economy (SARB, fuel, SARS)', winner: 'stoki' },
    { feature: 'WhatsApp bot', competitor: 'Not supported', stoki: 'Record sales, ask questions, get answers on WhatsApp', winner: 'stoki' },
    { feature: 'Business loans / capital', competitor: 'Yes — iKhokha Cash Advance, based on card takings', stoki: 'Not offered — AI advisor signposts SEFA / NYDA / NEF', winner: 'competitor' },
    { feature: 'Offline support', competitor: 'Some offline in-app', stoki: 'Offline-first PWA — sales queue during load-shedding', winner: 'stoki' },
    { feature: 'Multi-store', competitor: 'Yes on Business plan', stoki: 'Yes on all tiers — separate ai_tone / VAT per store', winner: 'stoki' },
    { feature: 'Cost / margin tracking', competitor: 'Limited', stoki: 'Yes — with AI margin-erosion alerts', winner: 'stoki' },
    { feature: 'AI voice adapts to owner', competitor: 'N/A', stoki: 'Kasi / Plain / Professional / Technical — one setting', winner: 'stoki' },
    { feature: 'Language support', competitor: 'English focus', stoki: 'English + Zulu, Xhosa, Sotho, Afrikaans (rolling)', winner: 'stoki' },
    { feature: 'Distribution', competitor: 'Readers in retailers + direct online; Kazang footprint', stoki: 'Digital-first — sign up, use on any phone', winner: 'competitor' },
    { feature: 'Pricing model', competitor: 'Card fees per transaction + monthly plan for Business tier', stoki: 'Free first store; Pro/Business subscription (ZAR)', winner: 'tie' },
  ],
  chooseCompetitor: [
    'You need in-person card acceptance today — a physical reader for tap / chip / swipe.',
    'You want an online payment link to send to customers via WhatsApp / email / QR.',
    'You want short-term merchant finance based on your card takings — iKhokha Cash Advance.',
    'Your business is card-heavy (formal retail, salons taking mostly card).',
    'You want one company as both your payment processor AND your card hardware supplier.',
    'You value the Kazang airtime distribution footprint (rural / township airtime resale).',
  ],
  chooseStoki: [
    'You already have a payment provider (iKhokha, Yoco, SnapScan, PayFast, Peach) and need the ERP layer on top — books, VAT, payroll, AI, WhatsApp.',
    'You need SARS compliance built in — VAT201, PAYE, UIF, SDL, EMP201.',
    'You give store credit to regulars and need a credit book with WhatsApp reminders.',
    'You want an AI advisor that answers "how is business?" grounded in your numbers plus SA economic context.',
    'You want to run your business from WhatsApp.',
    'You want a product that adapts its voice — from kasi vibe to full accounting terminology.',
    'You take mostly cash / EFT / snapscan and don\'t need a card reader.',
    'You want an offline-first PWA that keeps trading through load-shedding without any hardware.',
  ],
  runBoth:
    'This is the setup we recommend to most SA SMMEs using iKhokha today. <strong>iKhokha at the till for card acceptance</strong> (Solo reader, PayLinks, Cash Advance lending), <strong>Stoki for everything else</strong> — inventory, credit book, VAT201, PAYE, invoices, AI advisor, WhatsApp bot. Export your iKhokha daily total into Stoki as a single summary line at cash-up, and your books stay clean.',
  pricingIntro:
    'The two products have fundamentally different pricing models — iKhokha monetises card volume, Stoki monetises features. Direct comparison is misleading.',
  pricingBullets: [
    { label: 'iKhokha', body: 'Card fees per transaction (typically 2.75% + VAT card-present, higher for online). iKhokha Business tier for advanced features. Reader hardware upfront (from a few hundred rand).' },
    { label: 'Stoki', body: 'Free forever for your first store. Pro tier for payroll, invoicing, VAT201, and AI advisor. 120-day Business trial for every new account. All ZAR — no forex fees.' },
  ],
  faqs: [
    { q: 'Can Stoki process card payments like iKhokha?', a: 'No. Stoki does not process cards and does not compete with iKhokha on payment acceptance. If you need in-person card payments or a paylink, use iKhokha (or Yoco, SnapScan, PayFast, Peach). Stoki records the sale after the payment is taken — via the till, via credit, or via cash.' },
    { q: 'Should I move from iKhokha to Stoki?', a: 'Probably no — keep iKhokha for card acceptance and the reader. Add Stoki alongside for the ERP layer (books, credit book, VAT201, payroll, AI advisor) that iKhokha Books doesn\'t cover. Best of both worlds without giving up the card reader you rely on.' },
    { q: 'Do I need an iKhokha reader to use Stoki?', a: 'No. Stoki works with any payment method — cash, card, EFT, credit, SnapScan. It doesn\'t require any specific hardware. If you take cards via iKhokha, Yoco, SnapScan, or another provider, Stoki records the sale and the payment method against your ledger.' },
    { q: 'Does iKhokha do VAT201 or PAYE for South Africa?', a: 'Not directly. iKhokha Books reports card takings and expenses, but SARS-compliant VAT201 and EMP201 must be generated separately — typically by an accountant, or in Stoki. Stoki\'s VAT201 export follows SARS block 1-15 layout and can be filed via eFiling with no manual re-keying.' },
    { q: 'Does iKhokha have an AI advisor?', a: 'Not at this level. iKhokha has reports and analytics but no AI advisor grounded in your data + the SA economy. Stoki has an AI business advisor that answers questions about your store using your actual numbers plus SA-specific context (SARB rates, fuel prices, SARS deadlines, load-shedding).' },
    { q: 'Is iKhokha Cash Advance a better funding source than my bank?', a: 'Depends. iKhokha Cash Advance lends against your card volume, so it\'s fast for card-heavy businesses and skips traditional credit checks. Downside: cost of capital is typically higher than a bank overdraft or SEFA loan. Stoki\'s AI advisor can walk you through SEFA / NYDA / NEF alternatives if you prefer public-sector funding.' },
    { q: 'Which is better for a spaza shop?', a: 'Stoki, in most cases. Spaza economics are cash-heavy with credit customers — you don\'t need iKhokha\'s card reader as your primary need. Stoki\'s credit book, airtime dispensing, and WhatsApp bot are much more valuable for a spaza than iKhokha\'s POS. If you want to accept cards too, run both.' },
    { q: 'iKhokha vs Yoco vs Stoki — how do I choose?', a: 'iKhokha and Yoco are competitors on card acceptance (both SA payment processors with readers + light POS + light books + lending). Stoki is not a card processor — we complement both. If you take cards, pick between iKhokha and Yoco based on pricing, reader ergonomics, and lending terms. Whichever you pick, add Stoki alongside for the ERP layer neither company provides.' },
  ],
}

export const metadata = buildComparisonMetadata(data)
export default function Page() { return <ComparisonPage data={data} /> }
