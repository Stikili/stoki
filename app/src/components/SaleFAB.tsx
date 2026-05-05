'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

/**
 * Floating "Sell" button. Visible on the dashboard so the most-used flow is
 * always one tap away — but auto-hides on scroll-down so it doesn't sit on
 * top of content the user is reading. Reappears on scroll-up.
 *
 * Dashboard is busy enough already; this is the only floating affordance we
 * add there, and we keep its footprint small (a 12-row-high pill).
 */
export default function SaleFAB() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        if (y > lastY && y > 80) setVisible(false)
        else if (y < lastY) setVisible(true)
        lastY = y
        ticking = false
      })
    }
    // The scrollable surface in the (app) layout is the <main> element, not
    // window. Listen on whichever actually scrolls so the FAB hides correctly.
    const main = document.querySelector('main')
    const target: HTMLElement | Window = main ?? window
    target.addEventListener('scroll', onScroll, { passive: true } as AddEventListenerOptions)
    return () => target.removeEventListener('scroll', onScroll as EventListener)
  }, [])

  return (
    <Link
      href="/sales"
      aria-label="New sale"
      className="fixed bottom-24 right-5 z-30 flex items-center gap-2 pl-4 pr-5 h-12 rounded-full font-semibold text-sm active:scale-[0.96]"
      style={{
        background: '#00C896',
        color: 'var(--btn-primary-text)',
        boxShadow: '0 8px 22px -8px rgba(0,200,150,0.55)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 220ms ease, transform 220ms ease',
      }}
    >
      <Plus size={18} strokeWidth={2.5} />
      Sell
    </Link>
  )
}
