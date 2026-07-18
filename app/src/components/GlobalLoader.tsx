'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Global loading indicator.
 *
 * Shows an animated emerald spinning ring — with a soft backdrop card —
 * after any in-app click that triggers a navigation and hasn't resolved
 * within 200ms. Fast navigations never flash the spinner; slow ones
 * surface an "I'm on it" signal so the user doesn't wonder if the tap
 * registered.
 *
 * ─── Design notes on the third attempt ────────────────────────────────
 *
 * v1 (d792b19): used e.defaultPrevented check → killed EVERY Next.js
 *   Link click, because Link calls preventDefault to intercept the
 *   navigation.
 *
 * v2 (1c00b63): switched to capture-phase + removed defaultPrevented
 *   check. Also wrapped in Suspense (because useSearchParams requires
 *   it). This still didn't fire visibly, because:
 *
 *     a) `useSearchParams()` returns a new ReadonlyURLSearchParams
 *        reference on every render, so the pathname/searchParams effect
 *        fired every render, clearing the timer before 200ms elapsed.
 *     b) Suspense could unmount+remount the component mid-transition,
 *        wiping local state.
 *     c) Re-attaching the click listener on every pathname change added
 *        a race window when the listener was momentarily missing.
 *
 * v3 (this): drop useSearchParams entirely — read window.location
 *   inside the handler where we need it. Attach the listener ONCE for
 *   the component's lifetime. Depend the reset effect on `pathname`
 *   only (a stable string). No Suspense boundary needed.
 * ──────────────────────────────────────────────────────────────────────
 */
export default function GlobalLoader() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  // Two timers — one for the 200ms show delay, one for the safety
  // auto-hide. Stored in refs so they survive across renders and can
  // be cleared cleanly on route change / unmount.
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── TEMPORARY DEBUG (revert after loader is confirmed working) ──────
  // Logs mount + every click intercepted + every state transition so we
  // can see in the browser console exactly where the pipeline breaks.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[GlobalLoader] MOUNTED. pathname:', pathname)
  }, [pathname])

  // Cancel any pending timers + hide the spinner on route change.
  // Depends on `pathname` (stable string) only — no searchParams
  // instability to worry about.
  useEffect(() => {
    if (showTimerRef.current) { clearTimeout(showTimerRef.current); showTimerRef.current = null }
    if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null }
    setVisible(false)
  }, [pathname])

  // Click listener — attached ONCE for the component's lifetime. Uses
  // capture phase so we see the event before Next.js Link's handler
  // calls preventDefault. All same-URL comparisons read window.location
  // live so we don't get bitten by stale closure state.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // eslint-disable-next-line no-console
      console.log('[GlobalLoader] click event', { target: e.target, meta: e.metaKey, button: e.button })

      // Modifier-key clicks open in new tab/window — user isn't navigating
      // this tab, so no spinner.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (e.button !== 0) return

      const target = (e.target as HTMLElement | null)?.closest(
        'a, button[type="submit"], [data-loader-trigger]',
      ) as HTMLElement | null
      if (!target) {
        // eslint-disable-next-line no-console
        console.log('[GlobalLoader] not a nav target, skip')
        return
      }

      if (target instanceof HTMLAnchorElement) {
        const rawHref = target.getAttribute('href')
        // eslint-disable-next-line no-console
        console.log('[GlobalLoader] anchor click', { rawHref, targetAttr: target.target })
        if (!rawHref) return
        if (target.target === '_blank') return
        if (rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return
        try {
          const url = new URL(target.href, window.location.href)
          if (url.origin !== window.location.origin) return
          // Same-URL click (re-selecting current page) — no spinner.
          if (url.pathname === window.location.pathname && url.search === window.location.search) return
        } catch {
          return
        }
      }

      // eslint-disable-next-line no-console
      console.log('[GlobalLoader] arming 200ms timer')

      // Qualifying click → arm the 200ms show timer. Chain the safety
      // auto-hide inside the show callback so both timers move as a unit.
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
      showTimerRef.current = setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log('[GlobalLoader] TIMER FIRED → setVisible(true)')
        setVisible(true)
        if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
        // 8s safety net — if nothing else hides the spinner (e.g., a
        // server-action submit that stays on the same page), it goes
        // away after 8s rather than hanging.
        safetyTimerRef.current = setTimeout(() => setVisible(false), 8000)
      }, 200)
    }

    document.addEventListener('click', handleClick, { capture: true, passive: true })
    return () => {
      document.removeEventListener('click', handleClick, { capture: true } as EventListenerOptions)
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current)
    }
  }, []) // Attach once. No deps.

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[95] pointer-events-none flex items-center justify-center"
      aria-live="polite"
      role="status"
      aria-label="Loading"
    >
      <div
        className="stoki-loader-card rounded-2xl px-5 py-4 inline-flex items-center gap-3"
        style={{
          background: 'rgba(8, 15, 26, 0.72)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
        }}
      >
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
