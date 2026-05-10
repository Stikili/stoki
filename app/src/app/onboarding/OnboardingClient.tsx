'use client'

import { useState, useTransition } from 'react'
import { LocateFixed, MapPin, Wallet } from 'lucide-react'
import { saveStoreAction, saveStoreDetailsAction, completeOnboardingAction } from './actions'
import { StoreCategory } from '@/domain/entities/store'
import OnboardingHero from '@/components/OnboardingHero'
import Wordmark from '@/components/Wordmark'

type Step = 'type' | 'name' | 'details' | 'pack'

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

  // Optional details captured in the new step. Empty strings = "not set"
  // (matching settings/store), and the action drops invalid / blank values
  // server-side. State lives here so the user can navigate Back without
  // losing what they typed.
  const [lat, setLat] = useState<string>('')
  const [lng, setLng] = useState<string>('')
  const [cashBalance, setCashBalance] = useState<string>('')
  const [gpsBusy, setGpsBusy] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  function handleCategoryNext() {
    setStep('name')
  }

  function handleSaveName(formData: FormData) {
    formData.set('category', category)
    startTransition(async () => {
      const result = await saveStoreAction(formData)
      setStoreId(result.storeId)
      setStep('details')
    })
  }

  function captureGps() {
    setGpsError(null)
    if (!navigator.geolocation) {
      setGpsError("This browser doesn't support geolocation. Enter manually or skip.")
      return
    }
    setGpsBusy(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setGpsBusy(false)
      },
      err => {
        setGpsBusy(false)
        const msg = err.code === 1
          ? "Location permission denied — enter manually or skip."
          : err.code === 2
            ? "Couldn't get your location. Try near a window, enter manually, or skip."
            : "Location request timed out — enter manually or skip."
        setGpsError(msg)
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  function handleSaveDetails(skip: boolean) {
    if (!storeId) return
    if (skip) { setStep('pack'); return }
    startTransition(async () => {
      await saveStoreDetailsAction(storeId, { lat, lng, cashBalance })
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
            {(['type', 'name', 'details', 'pack'] as Step[]).map((s, i) => (
              <div
                key={s}
                className="rounded-full transition-all duration-300"
                style={{
                  width: step === s ? 20 : 8,
                  height: 8,
                  background: step === s
                    ? '#00C896'
                    : (['type', 'name', 'details', 'pack'].indexOf(step) > i ? 'rgba(0,200,150,0.4)' : 'var(--card-border)'),
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

          {/* Step 3 — Optional details (location + cash float).
              Both fields are optional; the user can hit "Skip for now" and
              fill in /settings/store later. Each field unlocks specific
              auto-pushed alerts: GPS → weather + competitor; cash → working-
              capital gap. */}
          {step === 'details' && (
            <>
              <button onClick={() => setStep('name')} className="text-muted text-xs mb-4 flex items-center gap-1">
                ← Back
              </button>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>A few quick details</h2>
              <p className="text-muted text-sm mb-5">
                Both optional — you can add or change these later in Settings.
              </p>

              {/* Location card */}
              <div className="rounded-2xl p-4 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={14} style={{ color: 'var(--muted)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Where is your shop?</p>
                </div>
                <p className="text-muted text-xs mb-3">
                  Powers weather and new-competitor-nearby alerts. Stays in your store record — never shared.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={captureGps}
                    disabled={gpsBusy}
                    className="rounded-xl py-2.5 px-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)', opacity: gpsBusy ? 0.6 : 1 }}
                  >
                    <LocateFixed size={14} />
                    {gpsBusy ? 'Getting your location…' : (lat && lng ? 'Update GPS' : 'Use my location')}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      inputMode="decimal" placeholder="Latitude"
                      value={lat} onChange={e => setLat(e.target.value)}
                      className="input"
                      style={{ padding: '10px 12px', fontSize: '13px' }}
                    />
                    <input
                      inputMode="decimal" placeholder="Longitude"
                      value={lng} onChange={e => setLng(e.target.value)}
                      className="input"
                      style={{ padding: '10px 12px', fontSize: '13px' }}
                    />
                  </div>
                  {gpsError && <p className="text-xs" style={{ color: '#ef4444' }}>{gpsError}</p>}
                </div>
              </div>

              {/* Cash float card */}
              <div className="rounded-2xl p-4 mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Wallet size={14} style={{ color: 'var(--muted)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Cash on hand</p>
                </div>
                <p className="text-muted text-xs mb-3">
                  Roughly how much cash do you have for restocking? Stoki uses this near month-end to suggest a budget-fit reorder list.
                </p>
                <input
                  type="number" inputMode="decimal" min="0" step="0.01"
                  placeholder="e.g. 1500.00"
                  value={cashBalance} onChange={e => setCashBalance(e.target.value)}
                  className="input"
                  style={{ padding: '10px 12px', fontSize: '14px' }}
                />
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <button
                  onClick={() => handleSaveDetails(false)}
                  disabled={isPending}
                  className="btn-primary active:scale-[0.98] transition-transform"
                  style={{ opacity: isPending ? 0.6 : 1 }}
                >
                  {isPending ? 'Saving…' : 'Save & continue →'}
                </button>
                <button
                  onClick={() => handleSaveDetails(true)}
                  disabled={isPending}
                  className="text-muted text-sm font-semibold py-3"
                  style={{ opacity: isPending ? 0.5 : 1 }}
                >
                  Skip for now
                </button>
              </div>
            </>
          )}

          {/* Step 4 — Starter pack */}
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
