import ComparisonPage, {
  buildComparisonMetadata,
  type ComparisonPageData,
} from '@/components/compare/ComparisonPage'

/**
 * SEO anchor page for "Stoki vs SimplePay" and adjacent SA queries
 * (SimplePay alternative, payroll software South Africa, SA cloud
 * payroll).
 *
 * SimplePay is the SA payroll incumbent — deep, specialised, priced
 * per-employee. Stoki includes payroll but as one module inside a
 * broader business OS. Honest positioning:
 *   - Payroll-only SMBs with 20+ employees → SimplePay
 *   - Full-business SMMEs with <10 employees → Stoki
 * Where they intersect (5-15 employee SA SMME needing more than
 * payroll) the "run both" story doesn't apply cleanly; user picks
 * one.
 */

const data: ComparisonPageData = {
  slug: 'stoki-vs-simplepay',
  competitor: 'SimplePay',
  updated: '2026-07-19',
  title: 'Stoki vs SimplePay — SA Payroll and Business App Compared',
  description:
    'Honest 2026 comparison of Stoki and SimplePay for South African SMMEs. Payroll depth, PAYE/UIF/SDL, POS, credit book, invoicing, AI advisor — side-by-side.',
  ogDescription:
    'SimplePay is the SA payroll incumbent. Stoki has payroll built into a broader business OS. Honest comparison for SA SMMEs choosing between them.',
  headline: 'Stoki vs SimplePay — payroll depth vs full-business OS',
  intro:
    "SimplePay is the specialised SA payroll incumbent — deep, per-employee-priced, trusted by accountants. Stoki includes payroll but as one module inside a broader business operating system (POS, inventory, credit book, invoicing, AI advisor). Written by Stoki — honest about where SimplePay's depth wins vs where Stoki's breadth wins.",
  tldr: [
    "SimplePay wins for payroll-only businesses with 15+ employees, complex earnings/deductions/leave structures, or an accountant who's SimplePay-certified. Its payroll depth (batch processing, EMP501 reconciliation, IRP5 generation, benefit-in-kind calcs) is unmatched in SA.",
    "Stoki wins for owner-run SMMEs with 1-10 employees who also need POS, credit book, VAT201, invoicing, and an AI advisor in the same app. Payroll comes free with the Business tier — no separate per-employee subscription.",
    "The 'run both' story is thin here: SimplePay is payroll-only, Stoki includes payroll. Businesses usually pick one. A hybrid (Stoki daily + SimplePay for the payroll run) is possible but rarely worth the friction.",
  ],
  rows: [
    { feature: 'Core focus', competitor: 'SA payroll (specialised, single product)', stoki: 'SA business OS (POS + inventory + books + payroll + AI)', winner: 'tie' },
    { feature: 'Pricing model', competitor: 'Per-employee-per-month (typically R55-R110/employee)', stoki: 'Flat monthly tier — payroll included in Business (R249/mo, up to 5 employees)', winner: 'stoki' },
    { feature: 'PAYE / UIF / SDL calculation', competitor: 'Yes — the SA gold standard', stoki: 'Yes — covers the standard cases', winner: 'competitor' },
    { feature: 'EMP201 monthly return', competitor: 'Native — SARS-ready export', stoki: 'Native — SARS-ready export', winner: 'tie' },
    { feature: 'EMP501 bi-annual reconciliation', competitor: 'Native, mature workflow', stoki: 'Roadmap (currently manual reconciliation from monthly exports)', winner: 'competitor' },
    { feature: 'IRP5 / IT3(a) generation', competitor: 'Native', stoki: 'Roadmap', winner: 'competitor' },
    { feature: 'Benefit in kind (BIK) calculations', competitor: 'Deep — company car, medical, low-interest loans, etc.', stoki: 'Basic — covers common deductions', winner: 'competitor' },
    { feature: 'Leave management', competitor: 'Native — annual, sick, maternity, family responsibility, unpaid', stoki: 'Not native (owner tracks separately)', winner: 'competitor' },
    { feature: 'Employee self-service portal', competitor: 'Native — payslip access, leave requests', stoki: 'Not native — owner distributes payslips manually', winner: 'competitor' },
    { feature: 'Point of sale (till)', competitor: 'Not offered — payroll-only', stoki: 'Full POS with VAT receipts, weighables, airtime, credit', winner: 'stoki' },
    { feature: 'Inventory', competitor: 'Not offered', stoki: 'Full — categories, wastage, expiry, stocktake, POs', winner: 'stoki' },
    { feature: 'Credit book (informal debtors)', competitor: 'Not offered', stoki: 'Native — WhatsApp reminders, aging report', winner: 'stoki' },
    { feature: 'B2B invoicing', competitor: 'Not offered', stoki: 'PDF invoices + WhatsApp/email delivery', winner: 'stoki' },
    { feature: 'VAT201', competitor: 'Not offered', stoki: 'Native — auto-generated block 1-15 export', winner: 'stoki' },
    { feature: 'AI business advisor', competitor: 'Not offered', stoki: 'Grounded in your data + SA economy (SARB, fuel, SARS)', winner: 'stoki' },
    { feature: 'WhatsApp bot', competitor: 'Not offered', stoki: 'Record sales, ask questions, get answers on WhatsApp', winner: 'stoki' },
    { feature: 'Offline support', competitor: 'Cloud-only (payroll runs offline unusual)', stoki: 'Offline-first PWA — trades continue during load-shedding', winner: 'stoki' },
    { feature: 'Accountant ecosystem', competitor: 'Massive — SimplePay-certified accountants across SA', stoki: 'Accountant-collab mode coming; export packs available', winner: 'competitor' },
    { feature: 'Employee count that fits well', competitor: '5-500+ employees', stoki: '1-10 employees (5 on Business tier, unlimited on Enterprise)', winner: 'competitor' },
    { feature: 'Integrations', competitor: 'Xero, Sage, QuickBooks, biometric time-clocks', stoki: 'Limited — Meta WhatsApp, Ozow, Sentry, Vercel', winner: 'competitor' },
    { feature: 'SA-native economic context', competitor: 'Payroll-focused; no economic advisor', stoki: 'AI advisor references SARB, fuel, CPI, USD/ZAR daily', winner: 'stoki' },
  ],
  chooseCompetitor: [
    'You have 15+ employees, or complex payroll (multiple pay cycles, batch processing, benefit-in-kind calculations, tax directives).',
    'You need deep leave management (annual, sick, maternity, unpaid) with employee self-service.',
    'Your accountant is SimplePay-certified and runs payroll for you monthly.',
    'You need EMP501 bi-annual reconciliation + IRP5 / IT3(a) generation with SimplePay\'s mature workflow.',
    'Payroll is your primary software need; everything else runs in separate tools.',
    'You already use Xero / Sage / QuickBooks for accounting and want tight payroll integration.',
  ],
  chooseStoki: [
    'You have 1-10 employees and payroll is one workflow among many, not the whole reason you need software.',
    'You want POS + inventory + credit book + VAT201 + invoicing + AI advisor in the same app as your payroll.',
    'You want flat monthly pricing (payroll included in R249/mo Business) rather than per-employee costs that grow as you hire.',
    'You want a WhatsApp bot and an AI advisor grounded in the SA economy.',
    'You run a shop / service business / trade — not just an employer.',
    'You want SA compliance (VAT201, PAYE/UIF/SDL, EMP201) built into a single product without buying add-ons.',
  ],
  runBoth:
    'Uncommon — SimplePay is payroll-only and Stoki includes payroll, so running both means paying per-employee on SimplePay AND flat-fee on Stoki for overlapping functionality. If you have a specific reason (SimplePay for its bi-annual EMP501 mature workflow, Stoki for daily ops) you can — export payroll figures from Stoki monthly, run the actual pay-run in SimplePay, keep the ledger sync manual. Most SMMEs pick one and move on.',
  pricingIntro:
    'Different pricing models — per-employee (SimplePay) vs flat monthly tier with a headcount cap (Stoki). Direct comparison depends heavily on your team size.',
  pricingBullets: [
    { label: 'SimplePay', body: 'per-employee-per-month pricing (typically R55-R110/employee depending on features + volume). Payroll-only — no POS, inventory, credit book, VAT201, or AI advisor included.' },
    { label: 'Stoki Business', body: 'R249/month flat — up to 5 employees included, plus POS + inventory + credit book + invoicing + AI advisor + VAT201 + WhatsApp + everything else. For an SMME with 3 employees this is roughly a third of the SimplePay cost for just payroll.' },
    { label: 'Stoki Enterprise', body: 'From R899/month — unlimited employees + everything in Business. Break-even vs SimplePay per-employee is around 10-15 employees depending on their pricing tier.' },
  ],
  faqs: [
    { q: 'Is Stoki a SimplePay alternative for South Africa?', a: 'Yes — for small SA employers (1-10 employees) who want more than just payroll. Stoki\'s payroll module covers PAYE, UIF, SDL, EMP201, payslips, and standard deductions. If you need SimplePay\'s advanced features (BIK calcs, mature EMP501 workflow, employee self-service portal, tax directives), stay with SimplePay. If your payroll is standard and you also need POS + books + AI, Stoki is a better fit at half to a third the cost for small teams.' },
    { q: 'Does Stoki generate IRP5 / IT3(a) certificates?', a: 'Not yet natively — you can export the payroll summary and generate them via SimplePay or your accountant. Native IRP5 / IT3(a) generation is on our roadmap and lands alongside a broader payroll depth push.' },
    { q: 'Does Stoki handle bi-annual EMP501 reconciliation?', a: 'Not natively — currently you reconcile manually from monthly EMP201 exports. This is one of SimplePay\'s deepest wins. For a small team (1-5 employees) manual EMP501 is manageable; for 10+ employees SimplePay\'s workflow is worth the per-employee cost.' },
    { q: 'Can Stoki do leave management?', a: 'Basic leave tracking is on the roadmap; currently owners track leave separately. SimplePay\'s leave module (annual, sick, maternity, family responsibility, unpaid) is mature and covers SA labour law nuances Stoki hasn\'t modelled yet.' },
    { q: 'Should I move from SimplePay to Stoki?', a: 'Only if you have a small team (1-10 employees), standard payroll (no BIK / directives / complex deductions), and want the rest of Stoki (POS, books, AI, WhatsApp). If your payroll is complex or you have 15+ employees, keep SimplePay — it does that job better.' },
    { q: 'Should I move from Stoki to SimplePay?', a: 'Only if payroll has become the primary software need — you\'re hiring rapidly (past 10 employees), your payroll has grown complex, or your accountant strongly prefers SimplePay. Otherwise the flat Business tier including payroll usually stays cheaper as you grow.' },
    { q: 'Does my accountant support Stoki payroll?', a: 'Most SA accountants know SimplePay + Sage Payroll. Stoki payroll exports EMP201 in SARS-standard format any accountant can file. An accountant-collab mode (read-only invite + payroll review) is on the roadmap.' },
    { q: 'Which is better for a spaza / small shop with 2 employees?', a: 'Stoki. SimplePay is designed for payroll-first businesses; a spaza\'s daily reality is POS + credit book + airtime. Stoki\'s Business tier at R249/mo covers everything the shop needs including payroll for 2 employees — SimplePay for 2 employees is R110-R220/mo for just payroll and you\'d still need a separate POS.' },
  ],
}

export const metadata = buildComparisonMetadata(data)
export default function Page() { return <ComparisonPage data={data} /> }
