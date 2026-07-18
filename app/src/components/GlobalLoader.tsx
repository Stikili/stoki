'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Global loading indicator.
 *
 * Shows an animated spinning ring — with a soft backdrop card — after any
 * in-app click that triggers a navigation and hasn't resolved within
 * 200ms. Fast navigations never flash the spinner; slow ones (data-heavy
 * pages, weak connection, cold Vercel function) get an "I'm on it"
 * signal so the user doesn't wonder if the tap registered.
 *
 * Detection: a delegated click listener watches for same-origin
 * navigation triggers (internal `<a>` tags + `<button type="submit">`
 * inside a form). Starts a 200ms timer on qualifying clicks. On the
 * next `pathname`/`searchParams` change (route completed), the timer is
 * cancelled and the spinner hidden.
 *
 * Deliberately not covered:
 *   - external links (mailto:, tel:, target=_blank, cross-origin)
 *   - programmatic `router.push()` calls — those callers can await
 *     their own transition; if a global spinner is desired for a
 *     specific programmatic path, wrap it in a `useTransition` with a
 *     local spinner.
 *
 * The spinner overlay is `pointer-events: none` so it never blocks
 * further interaction (the user can still click, scroll, dismiss).
 */

function GlobalLoaderInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Route completed → cancel any pending timer + hide the spinner.
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }, [pathname, searchParams])

  // Safety auto-hide. If a click starts the loader but no route change
  // ever completes (e.g., server action that stays on the same page,
  // action that fails silently), the loader would otherwise hang.
  // 12 seconds is longer than any legitimate page load and short enough
  // that a stuck loader still eventually disappears.
  useEffect(() => {
    if (!visible) return
    const safety = setTimeout(() => setVisible(false), 12_000)
    return () => clearTimeout(safety)
  }, [visible])

  // Use capture-phase click listener so we see the event BEFORE any
  // library (Next.js Link, form handlers, etc.) calls preventDefault
  // as part of its own SPA-navigation flow. Without capture the event
  // is `defaultPrevented=true` by the time we see it and we can't
  // tell "cancelled navigation" from "SPA navigation intercepted".
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // Modifier-key clicks open in new tab / window — user isn't
      // navigating this tab, so no spinner.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (e.button !== 0) return

      const target = (e.target as HTMLElement | null)?.closest(
        'a, button[type="submit"], [data-loader-trigger]',
      ) as HTMLElement | null
      if (!target) return

      if (target instanceof HTMLAnchorElement) {
        const rawHref = target.getAttribute('href')
        if (!rawHref) return
        if (target.target === '_blank') return
        if (rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return
        try {
          const url = new URL(target.href, window.location.href)
          if (url.origin !== window.location.origin) return
          // Same-URL click (re-selecting current page) — no spinner.
          const currentSearch = window.location.search
          if (url.pathname === pathname && url.search === currentSearch) return
        } catch {
          return
        }
      }

      // Qualifying click → set a 200ms timer.
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setVisible(true), 200)
    }

    document.addEventListener('click', handleClick, { capture: true, passive: true })
    return () => {
      document.removeEventListener('click', handleClick, { capture: true } as EventListenerOptions)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[95] pointer-events-none flex items-center justify-center"
      aria-live="polite"
      role="status"
      aria-label="Loading"
    >
      {/* Backdrop card — subtle, non-blocking. Uses a translucent dark
          fill and blur so it reads on both dark and light backgrounds. */}
      <div
        className="stoki-loader-card rounded-2xl px-5 py-4 inline-flex items-center gap-3"
        style={{
          background: 'rgba(8, 15, 26, 0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* Spinning ring — pure CSS keyframes so it works in every
            browser without any JS animation lib. Emerald accent + faint
            grey base for the classic "arc chasing itself" look. */}
        <span
          className="stoki-loader-ring"
          aria-hidden
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '2.5px solid rgba(255, 255, 255, 0.15)',
            borderTopColor: '#00C896',
            animation: 'stoki-loader-spin 720ms linear infinite',
            display: 'inline-block',
          }}
        />
        <span
          style={{
            color: 'white',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.01em',
          }}
        >
          Loading…
        </span>
      </div>

      {/*
        Inline keyframes so this component is fully self-contained — no
        Tailwind config change, no globals.css addition required. Safe
        to include: identical @keyframes across many mounts is a no-op
        after the first insertion.
      */}
      <style>{`
        @keyframes stoki-loader-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes stoki-loader-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .stoki-loader-card {
          animation: stoki-loader-fade-in 140ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .stoki-loader-ring {
            animation-duration: 2.4s !important;
          }
          .stoki-loader-card {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Exported wrapper. `useSearchParams` must be inside a Suspense
 * boundary in the App Router — otherwise the surrounding tree opts
 * into client-side navigation for the whole route.
 */
export default function GlobalLoader() {
  return (
    <Suspense fallback={null}>
      <GlobalLoaderInner />
    </Suspense>
  )
}
