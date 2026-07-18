'use client'

import { useState, useTransition } from 'react'
import { AI_TONES, AiTone } from '@/domain/entities/ai-tone'
import { updateAiToneAction } from '@/app/(app)/settings/actions'

const cardStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: '16px',
}

/**
 * Owner-facing picker for how Stoki AI should speak to them.
 *
 * Every AI-generated string (in-app advisor, WhatsApp brain, monthly
 * summary, anomaly alerts, explain-line-item) reads the store's ai_tone
 * and adapts its register. This card is where the owner picks it.
 *
 * Live preview updates as the owner clicks each option — no save needed
 * to see the vibe. Persist happens only when they hit "Save changes".
 */
export default function AiToneCard({ storeId, currentTone }: {
  storeId: string
  currentTone: AiTone
}) {
  const [selected, setSelected] = useState<AiTone>(currentTone)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const activePreview = AI_TONES.find(t => t.key === selected)?.preview ?? ''
  const dirty = selected !== currentTone

  function handleSave() {
    if (!dirty) return
    startTransition(async () => {
      await updateAiToneAction(storeId, selected)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="rounded-2xl p-4" style={cardStyle}>
      <p className="font-semibold mb-1" style={{ color: 'var(--foreground)' }}>How Stoki AI talks to you</p>
      <p className="text-muted text-sm mb-4">
        Pick the voice you&apos;re most comfortable with. This changes how Stoki AI answers questions,
        writes your monthly summary, and explains anything on your dashboard — in-app and on WhatsApp.
      </p>

      {saved && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-semibold mb-3"
          style={{ background: '#143328', color: '#00C896', border: '1px solid #1E4D3F' }}
        >
          ✓ Tone updated
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3">
        {AI_TONES.map(t => {
          const isActive = t.key === selected
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSelected(t.key)}
              className="text-left rounded-xl p-3 transition"
              style={{
                background: isActive ? 'rgba(0, 200, 150, 0.08)' : 'var(--surface)',
                border: `1px solid ${isActive ? '#00C896' : 'var(--card-border)'}`,
              }}
              aria-pressed={isActive}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                  style={{
                    background: isActive ? '#00C896' : 'transparent',
                    border: `2px solid ${isActive ? '#00C896' : 'var(--card-border)'}`,
                  }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  {t.label}
                </span>
              </div>
              <p className="text-muted text-xs ml-5.5" style={{ marginLeft: '22px' }}>
                {t.description}
              </p>
            </button>
          )
        })}
      </div>

      {/* Live preview — updates the moment the owner clicks a different tone.
          Same information in each preview, different voice — so the owner
          can compare like-for-like. */}
      <div
        className="rounded-xl p-3 mb-3"
        style={{
          background: 'var(--surface)',
          border: '1px dashed var(--card-border)',
        }}
      >
        <p className="text-muted text-[11px] uppercase tracking-wider font-semibold mb-1.5">
          Preview
        </p>
        <p className="text-sm" style={{ color: 'var(--foreground)', lineHeight: 1.5 }}>
          &ldquo;{activePreview}&rdquo;
        </p>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty || isPending}
        className="rounded-xl py-3 font-semibold text-sm w-full"
        style={{
          background: '#00C896',
          color: '#080f1a',
          opacity: !dirty || isPending ? 0.5 : 1,
        }}
      >
        {isPending ? 'Saving…' : dirty ? 'Save tone' : 'Saved'}
      </button>
    </div>
  )
}
