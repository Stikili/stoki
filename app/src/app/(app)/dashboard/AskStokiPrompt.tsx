'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'

const SUGGESTIONS = [
  'What should I reorder?',
  'Best seller this week?',
  'How is profit this month?',
  'Who owes me money?',
] as const

const VAT_SUGGESTIONS = [
  'How much VAT did I collect this month?',
  'Show me overdue invoices',
] as const

export default function AskStokiPrompt({ vatRegistered = false }: { vatRegistered?: boolean }) {
  const chips = vatRegistered ? [...SUGGESTIONS.slice(0, 2), ...VAT_SUGGESTIONS] : [...SUGGESTIONS]

  return (
    <div className="card p-4">
      <Link href="/advisor" className="flex items-center gap-2 mb-3">
        <Logo size={18} color="#00C896" />
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Ask Stoki</p>
        <span className="text-muted text-xs">·</span>
        <span className="text-muted text-xs">your business assistant</span>
      </Link>
      <Link href="/advisor" className="block">
        <input
          placeholder="Ask anything about your shop…"
          readOnly
          className="input pointer-events-none"
          style={{ background: 'var(--surface)', cursor: 'pointer' }}
        />
      </Link>
      <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
        {chips.map((q) => (
          <Link
            key={q}
            href={`/advisor?q=${encodeURIComponent(q)}`}
            className="text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--card-border)' }}
          >
            {q}
          </Link>
        ))}
      </div>
    </div>
  )
}
