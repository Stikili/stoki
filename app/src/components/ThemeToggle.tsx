'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

/**
 * Small icon button that flips between light and dark mode. Reads/writes
 * the `stoki_theme` localStorage key via `useTheme()`, so a toggle anywhere
 * (landing, login, settings) drives the whole app — the boot script in
 * RootLayout pre-applies the saved theme on subsequent loads, so there's
 * no flash on navigation.
 *
 * Visual: 44×44 rounded pill, sun-icon when in dark, moon-icon when in
 * light. Sized + shaped to visually match the header's "Sign in" pill
 * button so the pair reads as a matched control cluster (Stripe /
 * Vercel / Notion header pattern — secondary icon-only control paired
 * with a primary CTA of the same height and border-radius family).
 * Inherits CSS var colours so it looks correct on both themes.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl min-h-0 transition-colors ${className}`}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--card-border)',
        color: 'var(--muted)',
      }}
    >
      <Icon size={16} strokeWidth={1.8} />
    </button>
  )
}
