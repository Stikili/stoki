'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Global loading indicator.
 *
 * Shows an animated Stoki logo — three stacked rounded blocks pulsing in
 * sequence — after any in-app click that triggers a navigation or
 * form-action and hasn't resolved within 200ms. Fast interactions never
 * flash the spinner; slow ones surface an "I'm on it" signal so the user
 * doesn't wonder if the tap registered.
 *
 * Click detection covers:
 *   - Internal <a> tags (Next.js Links, BottomNav tabs, footer links)
 *   - <button type="submit"> or plain <button> inside a <form>
 *     (server-action submits, native form submits)
 *   - Anything with [data-loader-trigger] for opt-in on custom buttons
 *
 * Ignored:
 *   - external hrefs (mailto:, tel:, target=_blank, cross-origin)
 *   - hash-only anchors
 *   - same-URL clicks (re-selecting the current page)
 *   - modifier-key clicks (open-in-new-tab)
 *   - programmatic router.push — those callers should own their local
 *     `isPending` state; a global overlay is the wrong altitude
 *
 * Safety net: 6s auto-hide so a click that never resolves (e.g., a
 * server-action toast that stays on the same page) doesn't strand
 * the overlay indefinitely. Route changes reset immediately.
 */
// Show immediately on every qualifying click — no delay. The user wants
// consistent visible feedback on every nav-bar / menu / tile / form
// interaction, even when the destination is a cached route that loads
// sub-100ms and would otherwise never show a spinner.
const SHOW_DELAY_MS = 0

// Minimum on-screen time once the loader shows. Prevents jarring flash
// on cached / instant navigations. 350ms is long enough for one full
// beat of the Stoki-logo pulse to register as intentional.
const MIN_DISPLAY_MS = 350

// Bounded fallback: hide the loader if nothing else has (e.g., a
// same-page server action). Short enough that a stuck spinner still
// eventually disappears.
const SAFETY_HIDE_MS = 6000

export default function GlobalLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // When we set visible=true we stamp the timestamp; the pathname reset
  // effect uses this to enforce the minimum display duration so the
  // spinner doesn't flash-and-vanish on fast navigations.
  const shownAtRef = useRef<number>(0)

  // Cancel any pending timers + hide the spinner on route change, but
  // respect the MIN_DISPLAY_MS floor if the loader is currently visible.
  useEffect(() => {
    if (showTimerRef.current) { clearTimeout(showTimerRef.current); showTimerRef.current = null }
    if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null }

    if (!visible) {
      // Nothing showing — nothing to defer.
      return
    }
    const elapsed = Date.now() - shownAtRef.current
    const remaining = MIN_DISPLAY_MS - elapsed
    if (remaining <= 0) {
      setVisible(false)
    } else {
      const t = setTimeout(() => setVisible(false), remaining)
      return () => clearTimeout(t)
    }
    // We only want this to run on route change — visible-flip is handled
    // inside the show/hide flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Click listener — attached ONCE for the component's lifetime. Uses
  // capture phase so we see the event before Next.js Link's handler
  // calls preventDefault. All same-URL comparisons read window.location
  // live so we don't get bitten by stale closure state.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (e.button !== 0) return

      const raw = e.target as HTMLElement | null
      if (!raw) return

      // Try common navigation triggers first.
      const nav = raw.closest('a, [data-loader-trigger]') as HTMLElement | null
      // Then form submit — including plain <button> inside a form
      // (which submits by default in HTML) that lacks an explicit
      // type attribute.
      const btn = raw.closest('button') as HTMLButtonElement | null
      // btn.type reflects the DOM attribute; TypeScript narrows to
      // 'submit' | 'reset' | 'button'. HTML default is 'submit' inside a
      // form, so `type === 'submit'` catches both explicit and implicit.
      // The DOM property literally reports 'submit' when the attribute
      // is absent AND the button is inside a form.
      const submitsForm = btn ? btn.type === 'submit' && btn.form !== null : false
      const target = nav ?? (submitsForm ? btn : null)
      if (!target) return

      if (target instanceof HTMLAnchorElement) {
        const rawHref = target.getAttribute('href')
        if (!rawHref) return
        if (target.target === '_blank') return
        if (rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return
        try {
          const url = new URL(target.href, window.location.href)
          if (url.origin !== window.location.origin) return
          if (url.pathname === window.location.pathname && url.search === window.location.search) return
        } catch {
          return
        }
      }

      // Qualifying interaction → arm the show timer.
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
      showTimerRef.current = setTimeout(() => {
        shownAtRef.current = Date.now()
        setVisible(true)
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
        safetyTimerRef.current = setTimeout(() => setVisible(false), SAFETY_HIDE_MS)
      }, SHOW_DELAY_MS)
    }

    document.addEventListener('click', handleClick, { capture: true, passive: true })
    return () => {
      document.removeEventListener('click', handleClick, { capture: true } as EventListenerOptions)
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
    }
  }, []) // Attach once.

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[95] pointer-events-none flex items-center justify-center"
      aria-live="polite"
      role="status"
      aria-label="Loading"
    >
      <div
        className="stoki-loader-card inline-flex flex-col items-center"
        style={{
          background: 'rgba(8, 15, 26, 0.78)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.42)',
        }}
      >
        <AnimatedStokiLogo />
        <span className="stoki-loader-label">Loading</span>
      </div>

      <style>{`
        @keyframes stoki-loader-pulse {
          0%, 60%, 100% { opacity: 0.28; transform: scaleX(1); }
          30% { opacity: 1; transform: scaleX(1.06); }
        }
        @keyframes stoki-loader-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        /*
          Card + logo + label all scale with the viewport via clamp().
          clamp(min, preferred, max) — the preferred is a viewport-relative
          value so the loader is proportionally sized on every device:
            iPhone SE (375px):  ~40px logo, small card
            iPhone 15 Pro (390px): ~42px logo
            iPad portrait (768px): ~56px logo, roomier card
            Desktop (1440px):  cap at 72px logo, generous card
          Prevents the "postage stamp on a 27-inch monitor" problem AND the
          "cramped tap target on a tiny phone" problem.
        */
        .stoki-loader-card {
          border-radius: clamp(1rem, 2.4vw, 1.5rem);
          padding: clamp(1rem, 2.5vw, 1.5rem) clamp(1.25rem, 3.5vw, 2rem);
          gap: clamp(0.6rem, 1.2vw, 0.9rem);
          animation: stoki-loader-fade-in 160ms ease-out;
        }
        .stoki-loader-logo {
          width:  clamp(36px, 6.5vw, 72px);
          height: clamp(36px, 6.5vw, 72px);
        }
        .stoki-loader-label {
          color: rgba(255, 255, 255, 0.88);
          font-size: clamp(10px, 1vw, 13px);
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .stoki-loader-block {
          transform-box: fill-box;
          transform-origin: center;
          animation: stoki-loader-pulse 1.35s ease-in-out infinite;
        }
        .stoki-loader-block-top    { animation-delay: 0ms;   }
        .stoki-loader-block-middle { animation-delay: 180ms; }
        .stoki-loader-block-bottom { animation-delay: 360ms; }
        @media (prefers-reduced-motion: reduce) {
          .stoki-loader-block { animation-duration: 3.6s !important; }
          .stoki-loader-card  { animation: none; }
        }
      `}</style>
    </div>
  )
}

/**
 * Animated Stoki mark — three stacked rounded blocks pulsing in
 * sequence top → middle → bottom. Mirrors the static `Logo` component's
 * geometry so it reads as "Stoki loading", not "generic spinner".
 */
function AnimatedStokiLogo() {
  return (
    <svg
      className="stoki-loader-logo"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden
    >
      <rect
        className="stoki-loader-block stoki-loader-block-top"
        x="20" y="10" width="32" height="12" rx="3"
        fill="#00C896"
      />
      <rect
        className="stoki-loader-block stoki-loader-block-middle"
        x="12" y="26" width="32" height="12" rx="3"
        fill="#00C896"
      />
      <rect
        className="stoki-loader-block stoki-loader-block-bottom"
        x="20" y="42" width="32" height="12" rx="3"
        fill="#00C896"
      />
    </svg>
  )
}
