import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ShoppingCart, Receipt, CreditCard, Scale, RotateCcw, Plus, Smartphone, Layers, Printer,
  Package, Tag, PackagePlus, Trash2, AlertTriangle, ClipboardCheck, Upload, Percent, ScanLine,
  BookOpen, Coins, FileText, Users, Clock, Landmark,
  TrendingDown, Repeat, FileMinus, ClipboardList, Warehouse, GitBranch,
  FileSpreadsheet, UserCheck, Calculator, FileDown,
  Sparkles, MessageSquare, Mic, Database, Globe, CalendarDays, AlertCircle, HelpCircle, TrendingUp, Camera, PiggyBank,
  MessageCircle, Bell, Megaphone,
  Sun, CloudRain, Fuel, Calendar, PackageX, CalendarRange, AlertOctagon, Wallet,
  Store, Shield, BarChart3, Lock,
  WifiOff, ShieldCheck, Languages, Moon, CircleDollarSign,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

/**
 * Public /features page — dedicated marketing surface for long-tail
 * SEO ("stoki features", "SA SMME POS features", "AI business
 * assistant features") and a canonical URL for external backlinks.
 *
 * Structured as a categorised feature grid with an icon per feature +
 * a leading group icon in an emerald bubble. Icon-per-feature keeps
 * the page scannable — a visitor looking for "does Stoki have a
 * barcode scanner?" spots the ScanLine icon and lands on the row
 * without having to read every card title.
 *
 * JSON-LD: ItemList of features + BreadcrumbList for SERP breadcrumbs.
 *
 * When we ship a new feature category, add a card here — this page
 * is the single public source of feature truth.
 */

const SITE = 'https://stokiapp.com'
const PAGE_URL = `${SITE}/features`

export const metadata: Metadata = {
  title: 'Features — everything Stoki does for SA small businesses',
  description:
    'Stoki features for South African SMMEs: POS, inventory, credit book, VAT201, PAYE payroll, AI business advisor, WhatsApp bot, offline PWA, and more. Every capability in one place.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'Stoki features — everything in one app',
    description:
      'POS, inventory, credit book, VAT201, PAYE payroll, AI advisor, WhatsApp bot, offline PWA. Free for your first store.',
    images: [{ url: '/og-image.png', width: 1200, height: 627 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stoki features — everything in one app',
    description:
      'POS, inventory, credit book, VAT201, PAYE payroll, AI advisor, WhatsApp bot, offline PWA.',
    images: ['/og-image.png'],
  },
}

type IconType = ComponentType<SVGProps<SVGSVGElement>>

interface Feature {
  name: string
  description: string
  live?: boolean
  icon: IconType
}

interface FeatureGroup {
  title: string
  intro: string
  icon: IconType
  features: Feature[]
}

const GROUPS: FeatureGroup[] = [
  {
    title: 'Sales & till',
    icon: ShoppingCart,
    intro: 'Ring up every kind of sale — cash, card, EFT, credit, mixed — and give the customer a proper receipt.',
    features: [
      { icon: ShoppingCart, name: 'Point-of-sale', description: 'Fast cart-based till with keyboard + barcode scanner input.', live: true },
      { icon: Receipt, name: 'VAT-aware receipts', description: 'Automatically calculates 15% VAT, prints SARS-compliant tax invoices when your business is VAT-registered.', live: true },
      { icon: CreditCard, name: 'Every payment method', description: 'Cash, card, EFT, credit, SnapScan, mixed — all captured per sale.', live: true },
      { icon: Scale, name: 'Weighable products', description: 'Sell rice / meat / fruit by kg or g with typed weight input; volumes in L or ml.', live: true },
      { icon: RotateCcw, name: 'Returns & refunds', description: 'One-tap reverse a sale, stock goes back to inventory, receipt annotated.', live: true },
      { icon: Plus, name: 'Manual / off-book sales', description: 'Quick-add line items not in inventory (extra services, one-off products).', live: true },
      { icon: Smartphone, name: 'Airtime PIN dispensing', description: 'Sell airtime and data as inventory; PINs dispensed FIFO with one-time voucher modal for the cashier to read to the customer.', live: true },
      { icon: Layers, name: 'Bundles', description: 'Sell a combo (e.g. bread + milk + eggs breakfast pack) as one line; component stock decrements automatically.', live: true },
      { icon: Printer, name: 'Bluetooth thermal printer', description: 'Print receipts to any ESC/POS-compatible Bluetooth printer via the browser Web Bluetooth API.', live: true },
    ],
  },
  {
    title: 'Inventory & stock',
    icon: Package,
    intro: 'Know what you have, what you owe on it, and what to reorder — down to the shelf.',
    features: [
      { icon: Tag, name: 'Products & prices', description: 'Full product catalogue with cost, price, VAT flag, reorder point, expiry date.', live: true },
      { icon: PackagePlus, name: 'Restocks with cost capture', description: 'Every restock captures unit cost + supplier; feeds the P&L and supplier-scorecard AI insight.', live: true },
      { icon: Trash2, name: 'Wastage tracking', description: 'Record damaged / expired / stolen stock separately from sales for accurate margin analysis.', live: true },
      { icon: AlertTriangle, name: 'Expiry alerts', description: 'Dashboard pill turns orange for expiring stock (7 days) and red for expired.', live: true },
      { icon: ClipboardCheck, name: 'Stocktake with variance', description: 'Physical count with live variance preview and P&L impact; audit trail of stocktake_lines captures cost-per-unit at count time.', live: true },
      { icon: Upload, name: 'CSV bulk import', description: 'Import your existing product list from any spreadsheet.', live: true },
      { icon: Percent, name: 'Bulk-set VAT-inclusive', description: 'Flip every product between VAT-inclusive and VAT-exclusive pricing in one action.', live: true },
      { icon: ScanLine, name: 'Barcode scanning', description: 'Phone camera doubles as a barcode scanner via html5-qrcode; matched SKUs auto-add to cart.', live: true },
    ],
  },
  {
    title: 'Money in',
    icon: TrendingUp,
    intro: 'Everyone who owes you money, tracked; every invoice sent, followed up.',
    features: [
      { icon: BookOpen, name: 'Credit book (informal debtors)', description: 'Track who owes what on their tab; WhatsApp reminders on a 3-day cooldown for overdue balances.', live: true },
      { icon: Coins, name: 'Debtor payment recording', description: 'Cashier records partial payments at the till; balance updates instantly.', live: true },
      { icon: FileText, name: 'B2B invoicing', description: 'SARS-compliant tax invoices with per-store sequential numbering, aging buckets, payment recording.', live: true },
      { icon: Users, name: 'B2B customer book', description: 'Formal customer records with tax numbers, payment terms, billing addresses.', live: true },
      { icon: Clock, name: 'Aged receivables', description: 'Current / 30 / 60 / 90+ day aging report across every open invoice.', live: true },
      { icon: Landmark, name: 'Invoice payments via bank rec', description: 'Import your bank CSV, matched credits auto-apply to open invoices.', live: true },
    ],
  },
  {
    title: 'Money out',
    icon: TrendingDown,
    intro: 'Every rand spent, categorised, reconciled — with the receipts SARS wants to see.',
    features: [
      { icon: Wallet, name: 'Expense tracking', description: 'Categorised expense entry with capital-vs-operating flag for VAT201 block 14 vs block 15 accuracy.', live: true },
      { icon: Repeat, name: 'Recurring expenses', description: 'Rent, salaries, subscriptions auto-post monthly via cron.', live: true },
      { icon: FileMinus, name: 'Supplier bills (payables)', description: 'Track what you owe each supplier with 30 / 60 / 90+ day aging.', live: true },
      { icon: ClipboardList, name: 'Purchase orders', description: 'Issue POs to suppliers, track expected delivery, receive against each line.', live: true },
      { icon: Warehouse, name: 'Fixed asset register', description: 'Fridges, vehicles, tills tracked with monthly straight-line depreciation flowing into P&L.', live: true },
      { icon: GitBranch, name: 'Bank reconciliation', description: 'FNB / Standard / ABSA / Nedbank / Capitec CSV import with confidence-scored matching.', live: true },
    ],
  },
  {
    title: 'Compliance & tax',
    icon: FileSpreadsheet,
    intro: 'SARS-native from the ground up. No add-ons, no extra subscriptions, no month-end panic.',
    features: [
      { icon: FileSpreadsheet, name: 'VAT201 export', description: 'Auto-generated block 1-15 worksheet ready to paste into SARS eFiling.', live: true },
      { icon: UserCheck, name: 'Payroll (PAYE / UIF / SDL)', description: 'Native SA payroll with EMP201 export, payslips per employee, monthly cycles.', live: true },
      { icon: Calculator, name: 'Provisional tax estimator', description: 'Estimated provisional payments based on your trailing sales + expenses + taxpayer type.', live: true },
      { icon: TrendingDown, name: 'Depreciation', description: 'Monthly straight-line depreciation posted from the fixed asset register.', live: true },
      { icon: FileDown, name: 'Accounting exports', description: 'CSV / XLSX exports formatted for Xero / Sage / QuickBooks / Pastel import.', live: true },
    ],
  },
  {
    title: 'AI advisor',
    icon: Sparkles,
    intro: 'The single most differentiated feature. Ask about your business in plain English and get answers grounded in your data + the SA economy.',
    features: [
      { icon: MessageSquare, name: '"How is business?" — plain English', description: 'Ask the AI anything about your store, sales, cash flow, or the SA economy in whatever way is natural.', live: true },
      { icon: Languages, name: 'AI voice adapts to owner', description: 'Kasi / Plain / Professional / Technical — one setting changes how every AI surface (advisor, monthly report, alerts, explain-line-item) talks to you.', live: true },
      { icon: Database, name: 'Grounded in your data', description: 'Every factual claim uses tool calls to pull real numbers from your store; the AI cannot invent revenue or debtors.', live: true },
      { icon: Globe, name: 'SA-native economic context', description: 'Answers reference current SARB repo rate, fuel prices, CPI, USD/ZAR — cached daily via a market-indicators pipeline.', live: true },
      { icon: CalendarDays, name: 'Monthly report', description: 'AI-written 4-6 sentence recap of your month, delivered 07:00 SAST on the 1st via in-app alert + web push.', live: true },
      { icon: AlertCircle, name: 'Anomaly detection', description: 'Nightly cron detects revenue swings and expense-category spikes vs a rolling baseline; AI writes the explanation in your tone.', live: true },
      { icon: HelpCircle, name: 'Explain this line item', description: 'One-tap "Ask AI" on any sale / expense row opens the advisor with the transaction pre-loaded as context.', live: true },
      { icon: PiggyBank, name: 'ROIC — "am I earning what I hoped?"', description: 'Optional invested-capital entry unlocks a return-on-invested-capital answer + monthly recap line.', live: true },
      { icon: Camera, name: 'Photo ingestion', description: 'Snap a supplier invoice or receipt; AI extracts line items and confirms before recording.', live: true },
      { icon: Mic, name: 'Voice input', description: 'Web Speech API captures voice questions on the /advisor page and the WhatsApp bot handles voice notes.', live: true },
    ],
  },
  {
    title: 'WhatsApp',
    icon: MessageCircle,
    intro: 'The app your customers already message you on. Sell, ask, log expenses — all from a chat.',
    features: [
      { icon: MessageCircle, name: 'AI advisor on WhatsApp', description: 'Send "how is business?" or "sold 5 bread" to your Stoki number and get an answer / logged sale in seconds.', live: true },
      { icon: Bell, name: 'Debtor reminders', description: 'Auto-nudge overdue debtors via Meta-approved template with a 3-day cooldown.', live: true },
      { icon: Megaphone, name: 'Customer broadcasts', description: 'Send Meta-templated marketing messages to opted-in B2B customers.', live: true },
      { icon: Mic, name: 'Voice-note handling', description: 'Speak your question into WhatsApp; Stoki transcribes + answers.', live: true },
      { icon: CalendarDays, name: 'Monthly report via WhatsApp (soon)', description: 'Same monthly recap delivered as a WhatsApp message once we register the Meta template.', live: false },
    ],
  },
  {
    title: 'Operations & alerts',
    icon: Bell,
    intro: 'Push notifications about the moments that actually move the till.',
    features: [
      { icon: Sun, name: 'Morning + evening summary push', description: "Yesterday's takings + today's low-stock alert + best seller.", live: true },
      { icon: CloudRain, name: 'Weather-stock push', description: 'Rain + a spike in umbrella / snack sales history? Push before you open.', live: true },
      { icon: Fuel, name: 'Fuel-day push', description: 'Fuel-price change coming Wednesday? Push Tuesday so you can restock at the current price.', live: true },
      { icon: Calendar, name: 'SASSA pay-day card', description: "Dashboard card 7 days before Older Persons / Disability / Children's grants — weekend + public-holiday-shifted.", live: true },
      { icon: TrendingDown, name: 'Margin-erosion alert', description: "A product's margin drops below 10% — daily push.", live: true },
      { icon: PackageX, name: 'Dead-stock alert', description: 'No sales in 30 days on a product with stock — weekly nudge.', live: true },
      { icon: CalendarRange, name: 'Month-end surge push', description: 'Sales history says you get a spike on payday? Push 3 days before.', live: true },
      { icon: AlertOctagon, name: 'Tax-threshold push', description: 'Turnover approaching R1m VAT-registration threshold? Weekly push.', live: true },
      { icon: Wallet, name: 'Working-capital gap push', description: 'Cash-on-hand vs upcoming committed expenses — nudge if the gap turns negative.', live: true },
    ],
  },
  {
    title: 'Multi-store & team',
    icon: Store,
    intro: 'Grow from one shop to a small chain without changing tools.',
    features: [
      { icon: Store, name: 'Multi-store', description: 'Up to 3 stores on Business; unlimited on Enterprise. Separate ai_tone / VAT status / cash float per store.', live: true },
      { icon: Shield, name: 'Team roles', description: 'Owner, manager, cashier roles with per-action role guards enforced server-side.', live: true },
      { icon: BarChart3, name: 'Cross-store reports', description: 'Roll up sales, stock, P&L across every shop.', live: true },
      { icon: Lock, name: 'Cashier till lock (per-role UI)', description: 'Cashiers see only the till + credit book + basic reports; back-office tools hidden.', live: true },
    ],
  },
  {
    title: 'Foundations',
    icon: ShieldCheck,
    intro: 'The infrastructure that makes the rest possible.',
    features: [
      { icon: WifiOff, name: 'Offline-first PWA', description: "Sale queue during Wi-Fi drops / load-shedding; syncs when you're back online.", live: true },
      { icon: ShieldCheck, name: 'POPIA data export', description: 'One-click download of every record we hold on you — Section 23 right of access, honoured natively.', live: true },
      { icon: Languages, name: 'Multilingual (rolling)', description: 'English live; Zulu / Xhosa / Sotho / Afrikaans arriving progressively.', live: true },
      { icon: Moon, name: 'Dark + light themes', description: 'Native light/dark toggle in Settings, respects OS preference.', live: true },
      { icon: CircleDollarSign, name: 'ZAR-native pricing', description: 'Billed in South African Rand via a local payment provider — no forex fees, no USD anchor.', live: true },
    ],
  },
]

export default function FeaturesPage() {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: GROUPS.flatMap((g, gi) =>
      g.features.map((f, fi) => ({
        '@type': 'ListItem',
        position: gi * 100 + fi + 1,
        name: f.name,
        description: f.description,
      })),
    ),
  }
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Features', item: PAGE_URL },
    ],
  }

  const totalFeatures = GROUPS.reduce((n, g) => n + g.features.length, 0)
  const liveFeatures = GROUPS.reduce((n, g) => n + g.features.filter(f => f.live !== false).length, 0)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([itemList, breadcrumb]) }}
      />

      <main className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-16" style={{ color: 'var(--foreground)' }}>
        <nav aria-label="Breadcrumb" className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">›</span>
          <span>Features</span>
        </nav>

        <header className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#00C896' }}>
            Features · {liveFeatures} live · {totalFeatures - liveFeatures} coming
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 leading-tight" style={{ color: 'var(--foreground)' }}>
            Everything Stoki does.
          </h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: 'var(--muted)' }}>
            One app that runs your small business — from the till through the books to the tax return.
            Built for Spaza&apos;s and SMMEs.
          </p>
        </header>

        {/* Jump-nav strip — sticky under the fixed page header on desktop
            so a visitor can quickly move between categories without
            scrolling through everything. Wraps to multi-row on narrow
            viewports. */}
        <nav
          aria-label="Category jump navigation"
          className="mb-14 flex flex-wrap items-center justify-center gap-2"
        >
          {GROUPS.map(g => {
            const Icon = g.icon
            return (
              <a
                key={g.title}
                href={`#${slug(g.title)}`}
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--muted)',
                }}
              >
                <Icon width={13} height={13} strokeWidth={1.9} />
                {g.title}
              </a>
            )
          })}
        </nav>

        {/* Categorised feature grid with icon per feature. */}
        <div className="space-y-16">
          {GROUPS.map(group => {
            const GroupIcon = group.icon
            return (
              <section
                key={group.title}
                aria-labelledby={slug(group.title)}
                className="scroll-mt-24"
                id={slug(group.title)}
              >
                {/* Group header — bigger icon in an emerald bubble anchors
                    the section visually so a scanning reader lands on the
                    right block at a glance. */}
                <div className="flex items-center gap-4 mb-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'rgba(0, 201, 141, 0.12)',
                      border: '1px solid rgba(0, 201, 141, 0.35)',
                      color: '#34d5a8',
                    }}
                  >
                    <GroupIcon width={22} height={22} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2
                      id={`${slug(group.title)}-heading`}
                      className="text-2xl font-bold leading-tight"
                      style={{ color: 'var(--foreground)' }}
                    >
                      {group.title}
                    </h2>
                    <p className="text-[11px] font-semibold uppercase tracking-widest mt-0.5" style={{ color: 'var(--muted-dim)' }}>
                      {group.features.length} feature{group.features.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <p className="text-sm sm:text-[15px] leading-relaxed mb-6 max-w-3xl" style={{ color: 'var(--muted)' }}>
                  {group.intro}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {group.features.map(f => {
                    const FIcon = f.icon
                    return (
                      <div
                        key={f.name}
                        className="rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--card-border)',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              background: 'rgba(0, 201, 141, 0.12)',
                              border: '1px solid rgba(0, 201, 141, 0.30)',
                              color: '#34d5a8',
                            }}
                          >
                            <FIcon width={16} height={16} strokeWidth={1.9} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{f.name}</p>
                              {f.live === false && (
                                <span
                                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded-md flex-shrink-0"
                                  style={{ background: '#00C896', color: '#0A0E17', letterSpacing: '0.06em' }}
                                >
                                  Soon
                                </span>
                              )}
                            </div>
                            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>{f.description}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>

        {/* CTA — every features page needs one primary conversion. */}
        <section aria-labelledby="cta" className="text-center py-14 mt-12">
          <h2 id="cta" className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            Try every feature — free for 120 days
          </h2>
          <p className="text-sm sm:text-base mb-6 max-w-xl mx-auto" style={{ color: 'var(--muted)' }}>
            Every new account starts with a 120-day full-Business trial. No card required.
          </p>
          <Link
            href="/register"
            className="btn-gloss inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-[15px]"
          >
            <span className="relative z-10">Sign up free →</span>
          </Link>
          <p className="text-xs mt-4" style={{ color: 'var(--muted-dim)' }}>
            Free forever for your first store · No card required
          </p>
        </section>

        <footer className="mt-12 pt-6 text-xs text-center" style={{ borderTop: '1px solid var(--card-border)', color: 'var(--muted)' }}>
          {totalFeatures} features across {GROUPS.length} categories
        </footer>
      </main>
    </>
  )
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
