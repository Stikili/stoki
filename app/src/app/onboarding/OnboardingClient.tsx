'use client'

import { useState, useTransition } from 'react'
import { saveStoreAction, completeOnboardingAction } from './actions'
import { StoreCategory } from '@/domain/entities/store'
import OnboardingHero from '@/components/OnboardingHero'
import Wordmark from '@/components/Wordmark'

type Step = 'type' | 'name' | 'pack'

const CATEGORIES: { value: StoreCategory; label: string; emoji: string; desc: string }[] = [
  { value: 'spaza',          label: 'Spaza shop',      emoji: '🏪', desc: 'Convenience items, airtime, drinks' },
  { value: 'general_dealer', label: 'General dealer',  emoji: '🏬', desc: 'Broader grocery & household range' },
  { value: 'food_stall',     label: 'Food stall',      emoji: '🍖', desc: 'Cooked food, snacks, drinks' },
  { value: 'other',          label: 'Other',            emoji: '📦', desc: 'Something else entirely' },
]

// Hero shown on the very-first-launch step. Big, warm, brand-anchored —
// the first impression a new user has of stoki.
const Hero = () => (
  <div className="mb-6 flex flex-col items-center">
    <OnboardingHero className="w-full max-w-[320px] h-auto" />
    <Wordmark height={32} textColor="var(--foreground)" className="mt-2" />
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
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-12 min-h-screen">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center flex flex-col items-center">
          <Hero />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            {isNew ? 'New store' : 'Welcome'}
          </h1>
          <p className="text-muted text-sm mt-1.5 max-w-xs">
            {isNew ? 'Set up another shop on your account.' : 'Let\'s get your shop on stoki — three quick steps.'}
          </p>
        </div>

        <div className="card rounded-3xl p-6">
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
                    : (['type', 'name', 'pack'].indexOf(step) > i ? 'rgba(0,200,150,0.4)' : 'var(--card-border)'),
                }}
              />
            ))}
          </div>

          {/* Step 1 — Business type */}
          {step === 'type' && (
            <>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>What kind of shop do you run?</h2>
              <p className="text-muted text-sm mb-5">Track sales, manage credit, and run your shop smarter.</p>
              <div className="flex flex-col gap-2 mb-5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                    style={category === cat.value
                      ? { background: 'var(--pill-green-bg)', border: '1px solid rgba(0,200,150,0.4)' }
                      : { background: 'var(--surface)', border: '1px solid var(--card-border)' }
                    }
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{cat.label}</p>
                      <p className="text-muted text-xs mt-0.5">{cat.desc}</p>
                    </div>
                    {category === cat.value && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#00C896' }}>
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4L4 7L10 1" stroke="var(--btn-primary-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCategoryNext}
                className="btn-primary active:scale-[0.98] transition-transform"
              >
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
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>Name your {categoryConfig.label.toLowerCase()}</h2>
              <p className="text-muted text-sm mb-5">What do your customers call it?</p>
              <form action={handleSaveName} className="flex flex-col gap-3">
                <input type="hidden" name="new" value={isNew ? '1' : '0'} />
                <input
                  name="name"
                  placeholder={category === 'food_stall' ? "e.g. Mama's Kitchen" : "e.g. Thabo's Spaza"}
                  required
                  autoFocus
                  className="input"
                />
                <input
                  name="phone"
                  type="tel"
                  placeholder="WhatsApp number (optional)"
                  className="input"
                />
                <p className="text-muted text-xs -mt-1 ml-1">For WhatsApp reminders to debtors</p>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary active:scale-[0.98] transition-transform mt-1"
                  style={{ opacity: isPending ? 0.6 : 1 }}
                >
                  {isPending ? 'Saving…' : 'Continue →'}
                </button>
              </form>
            </>
          )}

          {/* Step 3 — Starter pack */}
          {step === 'pack' && (
            <>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>Start with a starter pack?</h2>
              <p className="text-muted text-sm mb-5">
                We&apos;ll load ~20 common {categoryConfig.label.toLowerCase()} products with typical SA prices.
                You just fill in the quantities.
              </p>

              <div
                className="rounded-2xl p-4 mb-3"
                style={{ background: 'var(--pill-green-bg)', border: '1px solid var(--card-border)' }}
              >
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--foreground)' }}>{categoryConfig.emoji} Included in your pack</p>
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
                    className="btn-primary active:scale-[0.98] transition-transform"
                    style={{ opacity: isPending ? 0.6 : 1 }}
                  >
                    {isPending ? 'Setting up…' : 'Yes, load starter pack →'}
                  </button>
                )}
                <button
                  onClick={() => handleComplete(false)}
                  disabled={isPending}
                  className="w-full rounded-2xl py-4 text-sm font-semibold"
                  style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)', opacity: isPending ? 0.5 : 1 }}
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
