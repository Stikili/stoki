import type { Metadata } from 'next'
import Link from 'next/link'

/**
 * SEO anchor guide — "how to submit VAT201 South Africa" and related
 * long-tail queries (VAT201 deadlines, VAT registration threshold,
 * SARS eFiling VAT201, input vs output VAT).
 *
 * This is the first entry in a planned /guides tree. Written as a
 * standalone page (no shared GuidePage component yet — YAGNI until
 * we have 3+ guides). When we ship guide #3, refactor along the same
 * lines as ComparisonPage.
 *
 * Content sourced from SARS's own VAT201 documentation + eFiling docs.
 * Update the "Last updated" date + any figures if SARS changes rates
 * or thresholds. Keep every claim verifiable — bad-faith or wrong SARS
 * information gets flagged fast in accounting communities.
 */

const SITE = 'https://stokiapp.com'
const PAGE_URL = `${SITE}/guides/how-to-submit-vat201-south-africa`
const UPDATED_ISO = '2026-07-19'

export const metadata: Metadata = {
  title: 'How to Submit VAT201 in South Africa (2026 Guide)',
  description:
    'Step-by-step guide to filing VAT201 in South Africa: who needs to register, deadlines, understanding the form, filing on SARS eFiling, and common mistakes to avoid.',
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'article',
    url: PAGE_URL,
    title: 'How to Submit VAT201 in South Africa — 2026 Guide',
    description:
      'Everything a SA small business needs to know about VAT201: registration, deadlines, output vs input VAT, filing on eFiling, common mistakes.',
    images: [{ url: '/og-image.png', width: 1200, height: 627 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Submit VAT201 in South Africa — 2026 Guide',
    description:
      'Step-by-step: registration, deadlines, form breakdown, eFiling steps, common mistakes.',
    images: ['/og-image.png'],
  },
}

const FAQS = [
  {
    q: 'When must I register for VAT in South Africa?',
    a: 'Compulsory VAT registration kicks in when your taxable supplies exceed R1 million in any consecutive 12-month period, or when you have written contracts that will exceed R1 million in the next 12 months. Voluntary registration is available from R50,000 in taxable supplies over the past 12 months.',
  },
  {
    q: 'What is the current VAT rate in South Africa?',
    a: 'The standard VAT rate in South Africa is 15%. Some supplies are zero-rated (0% — includes exports and specific basic foodstuffs), and others are exempt (no VAT charged, no input VAT reclaimable).',
  },
  {
    q: 'How often must I submit VAT201?',
    a: 'Most vendors file bi-monthly (every two months) — SARS assigns one of Category A (Jan/Mar/May/Jul/Sep/Nov end) or Category B (Feb/Apr/Jun/Aug/Oct/Dec end) based on your registration. Larger businesses (turnover above R30 million) file monthly (Category C). Farmers can apply for Category D (every four months). SARS confirms your category on registration.',
  },
  {
    q: 'What is the deadline to file VAT201?',
    a: 'For most vendors filing on eFiling, VAT201 is due by the last business day of the month following the end of the tax period. So a March tax period (Category A) is due by the last business day of April. Manual/branch submissions have an earlier deadline (25th of the month following).',
  },
  {
    q: 'What is the difference between output VAT and input VAT?',
    a: 'Output VAT is the 15% you charge your customers on taxable supplies. Input VAT is the 15% you paid your suppliers on business purchases. Net VAT payable = output VAT minus input VAT. If input exceeds output (common if you export or invest in capital), SARS refunds the difference.',
  },
  {
    q: 'What is the difference between zero-rated and exempt for VAT?',
    a: 'Zero-rated supplies are taxable at 0% — you charge no VAT but CAN reclaim input VAT on related expenses (e.g. exports, brown bread, milk). Exempt supplies are NOT taxable — no VAT charged AND no input VAT reclaimable on related costs (e.g. residential rentals, most financial services, education).',
  },
  {
    q: 'What happens if I miss the VAT201 deadline?',
    a: 'SARS charges a 10% administrative penalty on the outstanding VAT, plus interest at the prescribed rate (currently around 11.5% per annum). Repeat late-filers may face further sanctions and increased audit risk. Late filings must still be submitted — the penalty applies whether you file late or not at all.',
  },
  {
    q: 'Can I submit VAT201 without an accountant?',
    a: 'Yes. VAT201 is designed for direct submission by the vendor via SARS eFiling. Most SMMEs with clean books can complete it in under 30 minutes. Tools like Stoki auto-generate the block-by-block figures from your sales and expenses so you copy the numbers straight into eFiling.',
  },
  {
    q: 'Do I need to keep receipts for VAT201?',
    a: 'Yes. SARS requires you to retain all tax invoices, receipts, credit notes, and supporting documentation for 5 years from the date of the last transaction, and to produce them on request during an audit. Digital copies are acceptable if they are complete and legible.',
  },
]

export default function Page() {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Submit VAT201 in South Africa (2026 Guide)',
    description: metadata.description,
    author: { '@type': 'Organization', name: 'Stoki', url: SITE },
    publisher: {
      '@type': 'Organization', name: 'Stoki',
      logo: { '@type': 'ImageObject', url: `${SITE}/icons/icon-512.png` },
    },
    datePublished: UPDATED_ISO,
    dateModified: UPDATED_ISO,
    image: `${SITE}/og-image.png`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': PAGE_URL },
    about: [
      { '@type': 'Thing', name: 'VAT201' },
      { '@type': 'GovernmentService', name: 'SARS VAT Return' },
    ],
  }

  const howTo = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to file VAT201 on SARS eFiling',
    description: 'Complete steps to submit a VAT201 return via the SARS eFiling portal.',
    totalTime: 'PT30M',
    step: [
      { '@type': 'HowToStep', position: 1, name: 'Log into eFiling', text: 'Open https://www.sarsefiling.co.za and log in with your credentials. Ensure your VAT profile is loaded on the left sidebar.' },
      { '@type': 'HowToStep', position: 2, name: 'Open the return', text: 'Navigate to Returns → Returns Issued → VAT → click the outstanding VAT201 for the current tax period.' },
      { '@type': 'HowToStep', position: 3, name: 'Complete output VAT blocks', text: 'Enter your standard-rated supplies (15%), zero-rated supplies, and exempt supplies for the period. Output VAT is calculated automatically.' },
      { '@type': 'HowToStep', position: 4, name: 'Complete input VAT blocks', text: 'Enter your standard-rated purchases, capital goods, and other input VAT eligible. Input VAT total is calculated automatically.' },
      { '@type': 'HowToStep', position: 5, name: 'Review + submit', text: 'Review the net VAT figure at the bottom. Click Submit. eFiling issues a payment reference (PRN) if VAT is owed, or refund confirmation if input exceeds output.' },
      { '@type': 'HowToStep', position: 6, name: 'Pay the VAT owed', text: 'Pay via bank push using the PRN, or set up an EFT payment on eFiling itself. Payment is due by the same deadline as the return.' },
    ],
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE}/guides` },
      { '@type': 'ListItem', position: 3, name: 'VAT201 South Africa', item: PAGE_URL },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([article, howTo, faqSchema, breadcrumb]) }}
      />

      <article className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-16" style={{ color: 'var(--foreground)' }}>
        <nav aria-label="Breadcrumb" className="text-xs mb-6" style={{ color: 'var(--muted)' }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-2">›</span>
          <span>Guides</span>
          <span className="mx-2">›</span>
          <span>VAT201 South Africa</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#00C896' }}>
            Guide · Updated 19 July 2026
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--foreground)' }}>
            How to submit VAT201 in South Africa
          </h1>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>
            Everything a South African small business needs to know about VAT201 — who has to register,
            when to file, how to complete each section, and where SMMEs most commonly get it wrong.
          </p>
        </header>

        {/* TL;DR block — Featured Snippet bait for "how to submit VAT201" */}
        <section aria-labelledby="tldr" className="mb-10 rounded-2xl p-5 sm:p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <h2 id="tldr" className="text-lg font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            The 30-second version
          </h2>
          <ol className="list-decimal ml-5 space-y-1.5 text-sm leading-relaxed">
            <li>You must register for VAT if your taxable turnover exceeds <strong>R1 million</strong> in any 12-month period. Voluntary registration is available from R50,000.</li>
            <li>The VAT rate in South Africa is <strong>15%</strong>. Most vendors file <strong>bi-monthly</strong> (every 2 months).</li>
            <li>VAT201 is due by the <strong>last business day of the month following</strong> the tax period end, when filed via eFiling.</li>
            <li>Net VAT payable = <strong>output VAT (charged to customers) − input VAT (paid to suppliers)</strong>. If input exceeds output, SARS refunds the difference.</li>
            <li>File on <strong>SARS eFiling</strong> — 30 min if your records are in order.</li>
          </ol>
        </section>

        <section aria-labelledby="who-must-file" className="mb-10">
          <h2 id="who-must-file" className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            Who must register for VAT?
          </h2>
          <p className="text-base leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>
            South African VAT registration falls into two buckets:
          </p>
          <ul className="list-disc ml-5 space-y-2 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Compulsory:</strong> your taxable supplies (sales) have exceeded — or will exceed under written contract — <strong>R1 million in any consecutive 12-month period</strong>. You must apply within 21 business days of the threshold being reached.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Voluntary:</strong> your taxable supplies have exceeded <strong>R50,000 in the past 12 months</strong>. Voluntary registration is useful if you have big input VAT (buying stock, capital goods) that you want to reclaim, or your business customers require you to charge VAT.
            </li>
          </ul>
          <p className="text-base leading-relaxed mt-3" style={{ color: 'var(--muted)' }}>
            Once registered, you must charge 15% VAT on all standard-rated supplies, keep proper records, and file VAT201 every tax period — even if you had no activity.
          </p>
        </section>

        <section aria-labelledby="deadlines" className="mb-10">
          <h2 id="deadlines" className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            When must I file? — deadlines
          </h2>
          <p className="text-base leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>
            SARS assigns you a filing category on registration:
          </p>
          <div className="overflow-x-auto mb-4 rounded-2xl" style={{ border: '1px solid var(--card-border)' }}>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface)' }}>
                  <th className="text-left px-3 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>Category</th>
                  <th className="text-left px-3 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>Tax period</th>
                  <th className="text-left px-3 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>Who</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: '1px solid var(--card-border)' }}>
                  <td className="px-3 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>A</td>
                  <td className="px-3 py-3" style={{ color: 'var(--muted)' }}>Bi-monthly, ending Jan / Mar / May / Jul / Sep / Nov</td>
                  <td className="px-3 py-3" style={{ color: 'var(--muted)' }}>Default for most vendors</td>
                </tr>
                <tr style={{ background: 'var(--surface)', borderTop: '1px solid var(--card-border)' }}>
                  <td className="px-3 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>B</td>
                  <td className="px-3 py-3" style={{ color: 'var(--muted)' }}>Bi-monthly, ending Feb / Apr / Jun / Aug / Oct / Dec</td>
                  <td className="px-3 py-3" style={{ color: 'var(--muted)' }}>Default for most vendors</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--card-border)' }}>
                  <td className="px-3 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>C</td>
                  <td className="px-3 py-3" style={{ color: 'var(--muted)' }}>Monthly</td>
                  <td className="px-3 py-3" style={{ color: 'var(--muted)' }}>Turnover above R30 million</td>
                </tr>
                <tr style={{ background: 'var(--surface)', borderTop: '1px solid var(--card-border)' }}>
                  <td className="px-3 py-3 font-semibold" style={{ color: 'var(--foreground)' }}>D</td>
                  <td className="px-3 py-3" style={{ color: 'var(--muted)' }}>Every 4 months</td>
                  <td className="px-3 py-3" style={{ color: 'var(--muted)' }}>Farmers (on application)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--foreground)' }}>Deadline (eFiling):</strong> the last business day of the month <em>following</em> your tax period end. So a Category A March tax period is due by the last business day of April. Manual submissions (rare) have an earlier deadline — the 25th of the month following. Late filings attract a 10% penalty plus interest.
          </p>
        </section>

        <section aria-labelledby="form-structure" className="mb-10">
          <h2 id="form-structure" className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            Understanding the VAT201 form
          </h2>
          <p className="text-base leading-relaxed mb-4" style={{ color: 'var(--muted)' }}>
            VAT201 breaks into three parts: <strong>output VAT</strong> (what you collected from customers), <strong>input VAT</strong> (what you paid suppliers), and the <strong>net VAT payable</strong> or refundable.
          </p>

          <h3 className="text-lg font-bold mb-2 mt-6" style={{ color: 'var(--foreground)' }}>1. Output VAT — what you collected</h3>
          <ul className="list-disc ml-5 space-y-1.5 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            <li><strong>Standard-rated supplies (15%):</strong> most sales — retail, services, B2B invoices with VAT.</li>
            <li><strong>Zero-rated supplies (0%):</strong> exports, specific basic foodstuffs (brown bread, mealie meal, samp, dried mealies, dried beans, lentils, tinned pilchards, milk powder, milk, cultured milk, fruit &amp; veg, rice, vegetable oil, eggs, illuminating paraffin). You charge R0 VAT but can still reclaim input VAT.</li>
            <li><strong>Exempt supplies:</strong> residential rentals, most financial services, educational services. NO VAT charged AND no input VAT reclaimable.</li>
            <li><strong>Adjustments &amp; change of use:</strong> if you took stock for personal use or moved a capital asset out of the business, an output-VAT adjustment applies.</li>
          </ul>

          <h3 className="text-lg font-bold mb-2 mt-6" style={{ color: 'var(--foreground)' }}>2. Input VAT — what you paid</h3>
          <ul className="list-disc ml-5 space-y-1.5 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            <li><strong>Standard-rated purchases:</strong> stock you bought for resale, supplier bills, business services (with valid tax invoices).</li>
            <li><strong>Capital goods:</strong> fridges, tills, vehicles (subject to entertainment / passenger-vehicle restrictions), buildings — reported separately from operating expenses.</li>
            <li><strong>Other input VAT:</strong> imports (customs VAT), specific adjustments, second-hand goods deemed input.</li>
          </ul>
          <p className="text-base leading-relaxed mt-3" style={{ color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--foreground)' }}>Every input VAT claim needs a valid tax invoice</strong> naming your VAT number. If the tax invoice is missing, wrong, or damaged — you cannot claim it.
          </p>

          <h3 className="text-lg font-bold mb-2 mt-6" style={{ color: 'var(--foreground)' }}>3. Net VAT</h3>
          <p className="text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            <strong style={{ color: 'var(--foreground)' }}>Net VAT payable = output VAT − input VAT.</strong> If positive, you owe SARS; if negative, SARS owes you a refund (typically processed within 21 business days for straightforward returns).
          </p>
        </section>

        <section aria-labelledby="how-to-file" className="mb-10">
          <h2 id="how-to-file" className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            How to file on SARS eFiling — step by step
          </h2>
          <ol className="list-decimal ml-5 space-y-3 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Log into eFiling.</strong> Open <a href="https://www.sarsefiling.co.za" className="underline" style={{ color: '#00C896' }} target="_blank" rel="noopener noreferrer">sarsefiling.co.za</a> and log in with your credentials. Ensure your VAT profile is active in the left sidebar.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Open the outstanding return.</strong> Returns → Returns Issued → VAT → click the VAT201 for the current tax period. If none is listed, SARS may not have issued it yet — wait a day and check again.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Complete the output-VAT blocks.</strong> Enter your standard-rated, zero-rated, and exempt supplies for the tax period. Output VAT is calculated automatically at 15% of standard-rated supplies.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Complete the input-VAT blocks.</strong> Enter standard-rated purchases, capital goods separately from operating expenses, and any other eligible input VAT. Have your supplier invoices ready — SARS may request them during audit.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Review the net figure.</strong> Check the bottom of the return — if net VAT is payable, note the payment reference (PRN). If refundable, SARS will process it after review.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Submit.</strong> Click <em>Submit</em>. You receive an immediate submission confirmation. Screenshot or PDF-save it for your records.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Pay by the deadline.</strong> Use the PRN via your bank\'s SARS payment option, or set up an EFT on eFiling itself. Payment is due by the same deadline as the return.
            </li>
          </ol>
        </section>

        <section aria-labelledby="common-mistakes" className="mb-10">
          <h2 id="common-mistakes" className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            Common VAT201 mistakes SA SMMEs make
          </h2>
          <ul className="list-disc ml-5 space-y-2.5 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Claiming input VAT without a valid tax invoice.</strong> Till slips and generic receipts don\'t count for anything over R5,000 — you need a proper tax invoice with your VAT number, the supplier\'s VAT number, and all required fields.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Confusing zero-rated with exempt.</strong> Zero-rated lets you reclaim input VAT; exempt does not. Getting this wrong on rental income or interest received creates a reclaim you\'re not entitled to.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Claiming entertainment expenses.</strong> Staff Christmas parties, client dinners, alcohol — input VAT on these is denied under Section 17(2). Common trap for restaurant / hospitality operators.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Claiming input VAT on passenger vehicles.</strong> Input VAT on cars used for private / business purposes is restricted — you generally cannot claim on the purchase, only on running costs subject to apportionment.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Filing zero returns because "there was no activity".</strong> You still need to file. Skipping a return triggers a penalty and moves you to SARS\'s "risky vendor" list.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Not adjusting for change in use.</strong> Taking stock for personal use is an output-VAT event. Moving a business vehicle to personal use requires an adjustment.
            </li>
            <li>
              <strong style={{ color: 'var(--foreground)' }}>Late payment despite on-time filing.</strong> The 10% penalty applies to late PAYMENT even if the return was submitted on time. Pay by the deadline, not "when the money comes in".
            </li>
          </ul>
        </section>

        {/* Product pitch — earned by the value above, not spammy */}
        <section aria-labelledby="how-stoki-helps" className="mb-10 rounded-2xl p-5 sm:p-6" style={{ background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.25)' }}>
          <h2 id="how-stoki-helps" className="text-2xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            How Stoki auto-generates VAT201
          </h2>
          <p className="text-base leading-relaxed mb-3" style={{ color: 'var(--muted)' }}>
            If you\'re running an SA small business on Stoki, VAT201 filing takes about 5 minutes instead of an hour:
          </p>
          <ul className="list-disc ml-5 space-y-2 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            <li>Every sale is tagged VAT-standard, zero-rated, or exempt at the point of sale — no bulk reclassification at month-end.</li>
            <li>Every expense captures whether input VAT is claimable and its category (operating vs capital).</li>
            <li>The VAT201 report auto-generates the block-by-block figures for the tax period.</li>
            <li>Copy the numbers straight into SARS eFiling, submit, done.</li>
            <li>All source records (tax invoices, till slips, expense receipts) stay in the app for the 5-year SARS audit-retention requirement.</li>
          </ul>
          <p className="text-base leading-relaxed mt-3" style={{ color: 'var(--muted)' }}>
            Free forever for your first store — including VAT201.{' '}
            <Link href="/register" className="underline font-semibold" style={{ color: '#00C896' }}>
              Get started at stokiapp.com
            </Link>
          </p>
        </section>

        <section aria-labelledby="faq" className="mb-10">
          <h2 id="faq" className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQS.map(f => (
              <details
                key={f.q}
                className="rounded-xl p-4"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              >
                <summary className="font-semibold cursor-pointer text-base" style={{ color: 'var(--foreground)' }}>
                  {f.q}
                </summary>
                <p className="mt-2 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="mt-12 pt-6 text-xs text-center" style={{ borderTop: '1px solid var(--card-border)', color: 'var(--muted)' }}>
          Last updated 19 July 2026. This guide is general information, not financial or tax advice. For your specific circumstances, consult a SARS-registered tax practitioner. Sources: SARS VAT guide (VAT 404), VAT 411 &amp; VAT 421 external guides, VAT Act 89 of 1991. Spotted an error? Email{' '}
          <a href="mailto:hello@stokiapp.com" className="underline" style={{ color: '#00C896' }}>hello@stokiapp.com</a>.
        </footer>
      </article>
    </>
  )
}
