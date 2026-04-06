'use client'

import { useState, useTransition } from 'react'
import { saveStoreAction, completeOnboardingAction } from './actions'
import { StoreCategory } from '@/domain/entities/store'

type Step = 'type' | 'name' | 'pack'

const CATEGORIES: { value: StoreCategory; label: string; emoji: string; desc: string }[] = [
  { value: 'spaza',          label: 'Spaza shop',      emoji: '🏪', desc: 'Convenience items, airtime, drinks' },
  { value: 'general_dealer', label: 'General dealer',  emoji: '🏬', desc: 'Broader grocery & household range' },
  { value: 'food_stall',     label: 'Food stall',      emoji: '🍖', desc: 'Cooked food, snacks, drinks' },
  { value: 'other',          label: 'Other',            emoji: '📦', desc: 'Something else entirely' },
]

const inputStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '14px',
  padding: '14px 16px',
  color: 'white',
  fontSize: '16px',
  outline: 'none',
  width: '100%',
} as const

const Logo = () => (
  <div style={{ filter: 'drop-shadow(0 0 20px rgba(0,200,150,0.4))' }} className="mb-4">
    <svg width="52" height="52" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#00C896"/>
      <polyline points="7,27 13,20 18,23 24,13 33,16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="33" cy="16" r="2" fill="white"/>
    </svg>
  </div>
)

export default function OnboardingClient({ isNew }: { isNew: boolean }) {
  const [step, setStep] = useState<Step>('type')
  const [category, setCategory] = useState<StoreCategory>('spaza')
  const [storeId, setStoreId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCategoryNext() {
    setStep('name')
  }

  function handleSaveName(formData: FormData) {
    formData.set('category', category)
    startTransition(async () => {
      const result = await saveStoreAction(formData)
      setStoreId(result.storeId)
      setStep('pack')
    })
  }

  function handleComplete(seed: boolean) {
    if (!storeId) return
    startTransition(() => completeOnboardingAction(storeId, category, seed))
  }

  const categoryConfig = CATEGORIES.find((c) => c.value === category)!

  return (
    <div
      className="flex flex-col flex-1 items-center justify-center px-6 py-12 min-h-screen"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,200,150,0.08) 0%, transparent 60%)' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center flex flex-col items-center">
          <Logo />
          <h1
            className="text-3xl font-black tracking-tight lowercase"
            style={{ background: 'linear-gradient(135deg, #ffffff 0%, #a8f0da 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            {isNew ? 'New store' : 'Welcome to stoki'}
          </h1>
        </div>

        <div
          className="rounded-3xl p-6"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 60px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.08) inset', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          {/* Progress dots */}
          <div className="flex items-center gap-2 justify-center mb-6">
            {(['type', 'name', 'pack'] as Step[]).map((s, i) => (
              <div
                key={s}
                className="rounded-full transition-all duration-300"
                style={{
                  width: step === s ? 20 : 8,
                  height: 8,
                  background: step === s
                    ? '#00C896'
                    : (['type', 'name', 'pack'].indexOf(step) > i ? 'rgba(0,200,150,0.4)' : 'rgba(255,255,255,0.12)'),
                }}
              />
            ))}
          </div>

          {/* Step 1 — Business type */}
          {step === 'type' && (
            <>
              <h2 className="text-lg font-bold text-white mb-1">What kind of shop do you run?</h2>
              <p className="text-muted text-sm mb-5">We&apos;ll personalise stoki for you.</p>
              <div className="flex flex-col gap-2 mb-5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                    style={category === cat.value
                      ? { background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.4)', boxShadow: '0 0 20px rgba(0,200,150,0.1)' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{cat.label}</p>
                      <p className="text-muted text-xs mt-0.5">{cat.desc}</p>
                    </div>
                    {category === cat.value && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#00C896' }}>
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4L4 7L10 1" stroke="#080f1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCategoryNext}
                className="w-full relative overflow-hidden active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(135deg, #00C896 0%, #00a87e 100%)', boxShadow: '0 0 28px rgba(0,200,150,0.4), 0 1px 0 rgba(255,255,255,0.25) inset', borderRadius: '14px', padding: '15px', color: '#080f1a', fontWeight: 700, fontSize: '16px' }}
              >
                <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)', borderRadius: 'inherit' }} />
                Continue →
              </button>
            </>
          )}

          {/* Step 2 — Store name */}
          {step === 'name' && (
            <>
              <button onClick={() => setStep('type')} className="text-muted text-xs mb-4 flex items-center gap-1">
                ← Back
              </button>
              <h2 className="text-lg font-bold text-white mb-1">Name your {categoryConfig.label.toLowerCase()}</h2>
              <p className="text-muted text-sm mb-5">What do your customers call it?</p>
              <form action={handleSaveName} className="flex flex-col gap-3">
                <input type="hidden" name="new" value={isNew ? '1' : '0'} />
                <input
                  name="name"
                  placeholder={category === 'food_stall' ? "e.g. Mama's Kitchen" : "e.g. Thabo's Spaza"}
                  required
                  autoFocus
                  style={inputStyle}
                />
                <input
                  name="phone"
                  type="tel"
                  placeholder="WhatsApp number (optional)"
                  style={inputStyle}
                />
                <p className="text-muted text-xs -mt-1 ml-1">For WhatsApp reminders to debtors</p>
                <button
                  type="submit"
                  disabled={isPending}
                  className="relative overflow-hidden active:scale-[0.98] transition-transform mt-1"
                  style={{ background: 'linear-gradient(135deg, #00C896 0%, #00a87e 100%)', boxShadow: '0 0 28px rgba(0,200,150,0.4), 0 1px 0 rgba(255,255,255,0.25) inset', borderRadius: '14px', padding: '15px', color: '#080f1a', fontWeight: 700, fontSize: '16px', opacity: isPending ? 0.6 : 1 }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)', borderRadius: 'inherit' }} />
                  {isPending ? 'Saving…' : 'Continue →'}
                </button>
              </form>
            </>
          )}

          {/* Step 3 — Starter pack */}
          {step === 'pack' && (
            <>
              <h2 className="text-lg font-bold text-white mb-1">Start with a starter pack?</h2>
              <p className="text-muted text-sm mb-5">
                We&apos;ll load ~20 common {categoryConfig.label.toLowerCase()} products with typical SA prices.
                You just fill in the quantities.
              </p>

              <div
                className="rounded-2xl p-4 mb-3"
                style={{ background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.15)' }}
              >
                <p className="text-white text-sm font-semibold mb-2">{categoryConfig.emoji} Included in your pack</p>
                <p className="text-muted text-xs leading-relaxed">
                  {category === 'spaza' && 'Bread, milk, sugar, rice, cooking oil, eggs, Maggi noodles, Simba chips, Coke, Fanta, Jelly Tots, washing powder, Sunlight, airtime & more'}
                  {category === 'general_dealer' && 'Bread, milk, sugar, rice, cooking oil, eggs, mineral water, baked beans, pilchards, tissues, toothpaste, airtime, data & more'}
                  {category === 'food_stall' && 'Boerewors rolls, pap, chicken, vetkoek, Russians, atchaar, chakalaka, chips, magwinya, samp & beans & more'}
                  {category === 'other' && 'Start fresh — add your own products from inventory.'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {category !== 'other' && (
                  <button
                    onClick={() => handleComplete(true)}
                    disabled={isPending}
                    className="w-full relative overflow-hidden active:scale-[0.98] transition-transform"
                    style={{ background: 'linear-gradient(135deg, #00C896 0%, #00a87e 100%)', boxShadow: '0 0 28px rgba(0,200,150,0.4), 0 1px 0 rgba(255,255,255,0.25) inset', borderRadius: '14px', padding: '15px', color: '#080f1a', fontWeight: 700, fontSize: '16px', opacity: isPending ? 0.6 : 1 }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)', borderRadius: 'inherit' }} />
                    {isPending ? 'Setting up…' : 'Yes, load starter pack →'}
                  </button>
                )}
                <button
                  onClick={() => handleComplete(false)}
                  disabled={isPending}
                  className="w-full rounded-2xl py-4 text-sm font-semibold"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#5a7a94', opacity: isPending ? 0.5 : 1 }}
                >
                  {category === 'other' ? "Let's go →" : "I'll add my own products"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
