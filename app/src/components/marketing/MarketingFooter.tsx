import Link from 'next/link'

/**
 * Shared footer for the (marketing) route group — /features, /about,
 * /pricing, /status, /compare/*, /guides/*, /privacy, /terms.
 *
 * NOT used by the landing page itself — Landing's SlideCta owns its
 * own footer variant with `hidden sm:grid` (mobile-hidden) to keep
 * each swipe-deck slide fitting a single viewport. This shared footer
 * shows on ALL viewports for sub-pages, which don't have the
 * viewport-per-slide constraint.
 *
 * Structure: 3-col grid (Product / Resources / Compare Stoki), one
 * bottom legal row with company reg + Privacy / Terms link.
 * Stripe / Vercel / Linear / Notion pattern.
 */

const footerLinkClass = 'hover:underline transition-opacity hover:opacity-100'
const footerLinkStyle = { color: 'var(--muted)', opacity: 0.9 }

export default function MarketingFooter() {
  return (
    <footer className="w-full max-w-4xl mx-auto px-5 sm:px-8 pb-10 pt-6 mt-16">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-6 text-[12px] text-left">
        <div>
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2.5"
            style={{ color: 'var(--muted-dim)' }}
          >
            Product
          </div>
          <ul className="space-y-1.5 leading-tight">
            <li><Link href="/pricing" className={footerLinkClass} style={footerLinkStyle}>Pricing</Link></li>
            <li><Link href="/features" className={footerLinkClass} style={footerLinkStyle}>Features</Link></li>
            <li><Link href="/about" className={footerLinkClass} style={footerLinkStyle}>About</Link></li>
            <li><Link href="/status" className={footerLinkClass} style={footerLinkStyle}>Status</Link></li>
          </ul>
        </div>
        <div>
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2.5"
            style={{ color: 'var(--muted-dim)' }}
          >
            Resources
          </div>
          <ul className="space-y-1.5 leading-tight">
            <li>
              <Link
                href="/guides/how-to-submit-vat201-south-africa"
                className={footerLinkClass}
                style={footerLinkStyle}
              >
                VAT201 guide
              </Link>
            </li>
            <li>
              <a
                href="mailto:hello@stokiapp.com?subject=Hello%20Stoki"
                className={footerLinkClass}
                style={footerLinkStyle}
              >
                Contact
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/company/stokiapp"
                target="_blank"
                rel="noopener noreferrer"
                className={footerLinkClass}
                style={footerLinkStyle}
              >
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div
            className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2.5"
            style={{ color: 'var(--muted-dim)' }}
          >
            Compare Stoki with
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 leading-tight">
            <li><Link href="/compare/stoki-vs-loyverse" className={footerLinkClass} style={footerLinkStyle}>Loyverse</Link></li>
            <li><Link href="/compare/stoki-vs-yoco" className={footerLinkClass} style={footerLinkStyle}>Yoco</Link></li>
            <li><Link href="/compare/stoki-vs-xero" className={footerLinkClass} style={footerLinkStyle}>Xero</Link></li>
            <li><Link href="/compare/stoki-vs-sage" className={footerLinkClass} style={footerLinkStyle}>Sage</Link></li>
            <li><Link href="/compare/stoki-vs-ikhokha" className={footerLinkClass} style={footerLinkStyle}>iKhokha</Link></li>
            <li><Link href="/compare/stoki-vs-simplepay" className={footerLinkClass} style={footerLinkStyle}>SimplePay</Link></li>
            <li><Link href="/compare/stoki-vs-zoho-books" className={footerLinkClass} style={footerLinkStyle}>Zoho Books</Link></li>
            <li><Link href="/compare/stoki-vs-quickbooks" className={footerLinkClass} style={footerLinkStyle}>QuickBooks</Link></li>
          </ul>
        </div>
      </div>

      <div
        className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10.5px]"
        style={{ borderTop: '1px solid var(--card-border)', color: 'var(--muted-dim)' }}
      >
        <span>Stoki (Pty) Ltd · Reg. K2026258855</span>
        <span>
          <Link href="/privacy" className={footerLinkClass} style={footerLinkStyle}>Privacy</Link>
          {' · '}
          <Link href="/terms" className={footerLinkClass} style={footerLinkStyle}>Terms</Link>
        </span>
      </div>
    </footer>
  )
}
