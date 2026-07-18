'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { askAiUrl } from '@/lib/ask-ai-context'

/**
 * Small pill button that navigates the user to /advisor with a pre-built
 * question about a specific ledger row (sale / expense / restock). The
 * advisor auto-fires the question on mount, so the user lands on an
 * in-flight AI answer instead of a pre-filled input.
 *
 * Callers build the prompt via `askAiAboutSale` / `askAiAboutExpense` /
 * `askAiAboutRestock` in @/lib/ask-ai-context — those helpers are pure so
 * a test can pin their output.
 */
export default function AskAiButton({
  prompt,
  label = 'Ask AI',
  size = 'sm',
}: {
  prompt: string
  /** Visible label. Defaults to "Ask AI" — override for space-tight rows. */
  label?: string
  /** 'sm' for inline row placement, 'md' for standalone. */
  size?: 'sm' | 'md'
}) {
  const px = size === 'sm' ? '10px' : '14px'
  const py = size === 'sm' ? '4px' : '8px'
  const iconSize = size === 'sm' ? 11 : 14
  const fontSize = size === 'sm' ? '11px' : '13px'

  return (
    <Link
      href={askAiUrl(prompt)}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap active:scale-[0.96]"
      style={{
        background: 'rgba(0, 200, 150, 0.10)',
        color: '#00C896',
        border: '1px solid rgba(0, 200, 150, 0.25)',
        padding: `${py} ${px}`,
        fontSize,
      }}
      aria-label={`${label} about this`}
    >
      <Sparkles size={iconSize} />
      {label}
    </Link>
  )
}
