import MarketingHeader from '@/components/marketing/MarketingHeader'
import MarketingFooter from '@/components/marketing/MarketingFooter'

/**
 * Shared layout for the public marketing surface — every page under
 * app/(marketing)/ inherits the fixed header + shared footer + the
 * emerald/blue background orbs so the whole marketing area reads as
 * one brand.
 *
 * NOT applied to the landing page (`app/page.tsx`) — Landing has a
 * custom swipe-deck layout with a slide-specific footer variant, but
 * imports the same MarketingHeader component so the header stays in
 * sync visually across every marketing route.
 *
 * The `.stoki-login` class provides the dark landing palette + button
 * variants that all marketing pages inherit. `pt-20` on the content
 * wrapper accounts for the fixed header height (~72px + padding).
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="stoki-login min-h-screen flex flex-col relative">
      {/* Background orbs — same emerald + blue radials as Landing so
          every marketing page reads as one brand experience. Fixed
          so they stay put while the page scrolls. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 45% at 50% 18%, rgba(0, 201, 141, 0.18) 0%, rgba(0, 201, 141, 0.04) 45%, transparent 75%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(40% 40% at 90% 90%, rgba(56, 100, 220, 0.10) 0%, transparent 65%)',
        }}
      />

      <MarketingHeader />

      <div className="flex-1 pt-20 relative">{children}</div>

      <MarketingFooter />
    </div>
  )
}
