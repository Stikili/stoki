'use client'

import { useState, useEffect } from 'react'

const WALKTHROUGH_KEY = 'stoki_walkthrough_done'

const steps = [
  { title: 'Welcome to stoki!', desc: 'Your all-in-one business app. Let\'s take a quick tour.', emoji: '👋' },
  { title: 'Dashboard', desc: 'See today\'s revenue, profit, and quick-sell your top products from here.', emoji: '📊' },
  { title: 'Sales', desc: 'Tap products to add to cart. One tap = 1 item. Long press for bulk. Charge when ready.', emoji: '💰' },
  { title: 'Stock', desc: 'Track inventory, scan barcodes, get restock suggestions, and set expiry dates.', emoji: '📦' },
  { title: 'Credit Book', desc: 'Track who owes you. Send WhatsApp reminders. Settle partially or fully.', emoji: '📋' },
  { title: 'Stoki Insight', desc: 'Your business insight assistant knows your store data. Ask about profit, stock, or strategy.', emoji: '✨' },
  { title: 'You\'re ready!', desc: 'Head to Settings to change language, enable notifications, or export data.', emoji: '🚀' },
]

export default function Walkthrough() {
  const [step, setStep] = useState(0)
  const [show, setShow] = useState(false)

  // First-run check from localStorage; setState-in-effect is the canonical
  // SSR-safe pattern for browser-only state init.
  useEffect(() => {
    if (!localStorage.getItem(WALKTHROUGH_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true)
    }
  }, [])

  if (!show) return null

  function next() {
    if (step >= steps.length - 1) {
      localStorage.setItem(WALKTHROUGH_KEY, '1')
      setShow(false)
    } else {
      setStep((s) => s + 1)
    }
  }

  function skip() {
    localStorage.setItem(WALKTHROUGH_KEY, '1')
    setShow(false)
  }

  const s = steps[step]

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/85" />
      <div className="relative w-full max-w-sm rounded-3xl p-6 text-center"
        style={{ background: 'var(--sheet-bg)', border: '1px solid var(--card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div className="text-5xl mb-4">{s.emoji}</div>
        <h2 className="text-white font-bold text-xl mb-2">{s.title}</h2>
        <p className="text-muted text-sm mb-6 leading-relaxed">{s.desc}</p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-5">
          {steps.map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full transition-all" style={{
              background: i === step ? '#00C896' : i < step ? 'rgba(0,200,150,0.3)' : 'rgba(255,255,255,0.1)',
              width: i === step ? 16 : 8,
            }} />
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={skip} className="flex-1 py-3 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--card-border)' }}>
            Skip
          </button>
          <button onClick={next} className="flex-1 py-3 rounded-xl text-sm font-bold"
            style={{ background: '#00C896', color: 'var(--btn-primary-text)' }}>
            {step >= steps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
