'use client'

import { useState, useTransition, useRef, useEffect, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, LocateFixed, MapPin, Wallet, Receipt, Users2, LayoutGrid } from 'lucide-react'
import { saveStoreAction, saveStoreDetailsAction, completeOnboardingAction } from './actions'
import { StoreCategory } from '@/domain/entities/store'
import OnboardingHero from '@/components/OnboardingHero'
import Wordmark from '@/components/Wordmark'

// Seven swipeable panels. Each renders inside a fixed-height viewport
// (100dvh minus the sticky top + bottom chrome) so nothing scrolls on
// mobile. Granular sub-steps replace the old monolithic "details" page —
// each one is a single decision, sized for an iPhone SE viewport.
const STEPS = ['type', 'name', 'location', 'cash', 'business', 'usage', 'pack'] as const
type StepKey = typeof STEPS[number]

const CATEGORIES: { value: StoreCategory; label: string; emoji: string; desc: string }[] = [
  { value: 'spaza',          label: 'Spaza shop',      emoji: '🏪', desc: 'Convenience items, airtime, drinks' },
  { value: 'general_dealer', label: 'General dealer',  emoji: '🏬', desc: 'Broader grocery & household range' },
  { value: 'food_stall',     label: 'Food stall',      emoji: '🍖', desc: 'Cooked food, snacks, drinks' },
  { value: 'other',          label: 'Other',           emoji: '📦', desc: 'Something else entirely' },
]

// Pixel-distance of horizontal pointer travel needed to commit a swipe.
// Below this, the pointer-up is treated as a tap / accidental drift.
const SWIPE_COMMIT_PX = 60
// Cap on how far the deck can rubber-band past the boundaries during a
// drag — keeps the gesture from feeling broken at the first / last step.
const RUBBER_BAND_PX = 40

export default function OnboardingClient({ isNew }: { isNew: boolean }) {
  const [stepIdx, setStepIdx] = useState(0)
  const step: StepKey = STEPS[stepIdx]
  const [category, setCategory] = useState<StoreCategory>('spaza')
  const [storeId, setStoreId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Name + phone are controlled (used to live inside a server-action form)
  // so we can validate swipe-forward and not lose them on Back.
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // Optional details captured across the swipe panels. Empty strings = "not
  // set" — the action drops invalid / blank values server-side.
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [cashBalance, setCashBalance] = useState('')
  const [gpsBusy, setGpsBusy] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // VAT + employees — capture during onboarding so empty modules (VAT201,
  // Payroll) stay hidden from the Manage grid until the user is actually a
  // VAT vendor or has hired someone. Owner can flip these later in settings.
  const [vatRegistered, setVatRegistered] = useState(false)
  const [hasEmployees, setHasEmployees] = useState(false)
  // Dashboard density — drives initial Simple / Full toggle on the
  // dashboard. "unsure" defaults to simple (the spaza-friendly choice).
  const [usageStyle, setUsageStyle] = useState<'simple' | 'full' | 'unsure'>('unsure')

  const categoryConfig = CATEGORIES.find((c) => c.value === category)!

  function goNext() { setStepIdx((i) => Math.min(i + 1, STEPS.length - 1)) }
  function goPrev() { setStepIdx((i) => Math.max(i - 1, 0)) }

  function handleSaveName() {
    if (!name.trim()) return
    const fd = new FormData()
    fd.set('name', name.trim())
    if (phone.trim()) fd.set('phone', phone.trim())
    fd.set('category', category)
    fd.set('new', isNew ? '1' : '0')
    startTransition(async () => {
      const result = await saveStoreAction(fd)
      if (result.storeId) {
        setStoreId(result.storeId)
        goNext()
      }
    })
  }

  function handleSaveDetailsAndGoNext() {
    if (!storeId) return
    startTransition(async () => {
      await saveStoreDetailsAction(storeId, {
        lat, lng, cashBalance,
        vatRegistered, hasEmployees,
        simpleView: usageStyle !== 'full',
      })
      goNext()
    })
  }

  function handleComplete(seed: boolean) {
    if (!storeId) return
    startTransition(() => completeOnboardingAction(storeId, category, seed))
  }

  function captureGps() {
    setGpsError(null)
    if (!navigator.geolocation) {
      setGpsError("This browser doesn't support geolocation. Enter manually or skip.")
      return
    }
    setGpsBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6))
        setLng(pos.coords.longitude.toFixed(6))
        setGpsBusy(false)
      },
      (err) => {
        setGpsBusy(false)
        const msg = err.code === 1
          ? 'Location permission denied — enter manually or skip.'
          : err.code === 2
            ? "Couldn't get your location. Try near a window, enter manually, or skip."
            : 'Location request timed out — enter manually or skip.'
        setGpsError(msg)
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    )
  }

  // ── Forward / backward navigation with required server saves on the
  //    name → location and usage → pack boundaries. Same logic for the
  //    Continue button and the swipe-left gesture, so users can't bypass
  //    a save by swiping.
  function canAdvance(): boolean {
    if (isPending) return false
    if (step === 'name' && !name.trim()) return false
    if (step === 'pack') return false // pack uses explicit action buttons
    return true
  }

  function attemptNext() {
    if (!canAdvance()) return
    if (step === 'name') return handleSaveName()
    if (step === 'usage') return handleSaveDetailsAndGoNext()
    goNext()
  }

  function attemptPrev() {
    if (isPending) return
    if (stepIdx > 0) goPrev()
  }

  // ── Swipe gesture (pointer events — covers touch + mouse + stylus) ──
  // Drag mirrors the deck under the user's finger via a transient
  // dragDx state; on release the deck snaps to the new step (commit) or
  // returns to the current one (cancel).
  const trackRef = useRef<HTMLDivElement | null>(null)
  const pointerStartX = useRef<number | null>(null)
  const pointerStartY = useRef<number | null>(null)
  const lockedAxis = useRef<'horizontal' | 'vertical' | null>(null)
  const [dragDx, setDragDx] = useState(0)

  function onPointerDown(e: React.PointerEvent) {
    // Ignore drags that start on inputs — typing is more important than
    // navigating, and the inputs handle their own pointer behaviour.
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, button, a, [data-no-swipe]')) return
    pointerStartX.current = e.clientX
    pointerStartY.current = e.clientY
    lockedAxis.current = null
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (pointerStartX.current === null || pointerStartY.current === null) return
    const dx = e.clientX - pointerStartX.current
    const dy = e.clientY - pointerStartY.current

    // Lock the gesture to horizontal once it's clearly horizontal — keeps
    // small vertical jitter from snapping the deck around mid-tap.
    if (lockedAxis.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        lockedAxis.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      }
    }
    if (lockedAxis.current !== 'horizontal') return

    // Rubber-band the drag at the deck boundaries so swiping past the
    // first / last step doesn't feel like the gesture broke.
    let bounded = dx
    if (stepIdx === 0 && dx > 0) bounded = Math.min(dx * 0.4, RUBBER_BAND_PX)
    if (stepIdx === STEPS.length - 1 && dx < 0) bounded = Math.max(dx * 0.4, -RUBBER_BAND_PX)
    setDragDx(bounded)
  }

  function onPointerUp() {
    const dx = dragDx
    pointerStartX.current = null
    pointerStartY.current = null
    setDragDx(0)
    if (lockedAxis.current !== 'horizontal') return
    if (dx <= -SWIPE_COMMIT_PX) attemptNext()
    else if (dx >= SWIPE_COMMIT_PX) attemptPrev()
  }

  // Re-measure track width on resize for the transform math.
  const [trackWidth, setTrackWidth] = useState(0)
  useEffect(() => {
    function measure() { setTrackWidth(trackRef.current?.offsetWidth ?? 0) }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Translate distance: full-width step offset plus the active drag.
  const translatePx = -(stepIdx * trackWidth) + dragDx

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        background: 'var(--background)',
        // Prevent the body from scrolling underneath while the deck is mounted.
        touchAction: 'pan-y',
      }}
    >
      {/* Sticky top — small wordmark + step dots. */}
      <header className="flex flex-col items-center pt-4 pb-3 px-5 flex-shrink-0">
        <Wordmark height={22} textColor="var(--foreground)" />
        <div className="flex items-center gap-1.5 mt-3">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className="rounded-full transition-all duration-300"
              style={{
                width: stepIdx === i ? 18 : 6,
                height: 6,
                background: stepIdx === i
                  ? '#00C896'
                  : stepIdx > i ? 'rgba(0,200,150,0.4)' : 'var(--card-border)',
              }}
            />
          ))}
        </div>
      </header>

      {/* Swipe deck — fills the viewport between top + bottom chrome. */}
      <div
        ref={trackRef}
        className="flex-1 overflow-hidden relative"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="flex h-full"
          style={{
            width: `${STEPS.length * 100}%`,
            transform: `translateX(${translatePx}px)`,
            transition: dragDx === 0 ? 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
            willChange: 'transform',
          }}
        >
          {/* Panel 1 — type. The hero illustration is intentionally only on
              this first panel, where it doubles as a welcome moment. */}
          <Panel>
            {stepIdx === 0 && (
              <div className="flex justify-center mb-3" data-no-swipe>
                <OnboardingHero className="w-full max-w-[220px] h-auto" />
              </div>
            )}
            <PanelHeader
              title={isNew ? 'New store' : 'What kind of shop?'}
              subtitle={isNew ? 'Set up another shop on your account.' : 'Track sales, manage credit, and run your shop smarter.'}
            />
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition-all active:scale-[0.98]"
                  style={category === cat.value
                    ? { background: 'var(--pill-green-bg)', border: '1px solid rgba(0,200,150,0.4)' }
                    : { background: 'var(--surface)', border: '1px solid var(--card-border)' }
                  }
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{cat.label}</p>
                    <p className="text-muted text-[11px] mt-0.5 truncate">{cat.desc}</p>
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
          </Panel>

          {/* Panel 2 — name + phone. */}
          <Panel>
            <PanelHeader
              title={`Name your ${categoryConfig.label.toLowerCase()}`}
              subtitle="What do your customers call it?"
            />
            <div className="flex flex-col gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={category === 'food_stall' ? "e.g. Mama's Kitchen" : "e.g. Thabo's Spaza"}
                autoFocus={step === 'name'}
                className="input"
                data-no-swipe
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                placeholder="WhatsApp number (optional)"
                className="input"
                data-no-swipe
              />
              <p className="text-muted text-xs ml-1">For WhatsApp reminders to debtors</p>
            </div>
          </Panel>

          {/* Panel 3 — location (GPS). */}
          <Panel>
            <PanelHeader
              title="Where is your shop?"
              subtitle="Powers weather and new-competitor alerts. Optional — never shared."
            />
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={14} style={{ color: 'var(--muted)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Location</p>
              </div>
              <button
                type="button"
                onClick={captureGps}
                disabled={gpsBusy}
                data-no-swipe
                className="w-full rounded-xl py-2.5 px-3 text-sm font-semibold inline-flex items-center justify-center gap-2"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--foreground)', opacity: gpsBusy ? 0.6 : 1 }}
              >
                <LocateFixed size={14} />
                {gpsBusy ? 'Getting your location…' : (lat && lng ? 'Update GPS' : 'Use my location')}
              </button>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input
                  inputMode="decimal" placeholder="Latitude"
                  value={lat} onChange={(e) => setLat(e.target.value)}
                  className="input" data-no-swipe
                  style={{ padding: '10px 12px', fontSize: '13px' }}
                />
                <input
                  inputMode="decimal" placeholder="Longitude"
                  value={lng} onChange={(e) => setLng(e.target.value)}
                  className="input" data-no-swipe
                  style={{ padding: '10px 12px', fontSize: '13px' }}
                />
              </div>
              {gpsError && <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{gpsError}</p>}
            </div>
            <p className="text-muted text-[11px] mt-3 text-center">Swipe to skip — you can add this later in Settings.</p>
          </Panel>

          {/* Panel 4 — cash on hand. */}
          <Panel>
            <PanelHeader
              title="Cash on hand"
              subtitle="Roughly how much do you have for restocking? Stoki uses this near month-end to suggest a budget-fit reorder list."
            />
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Wallet size={14} style={{ color: 'var(--muted)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Float (optional)</p>
              </div>
              <input
                type="number" inputMode="decimal" min="0" step="0.01"
                placeholder="e.g. 1500.00"
                value={cashBalance} onChange={(e) => setCashBalance(e.target.value)}
                className="input" data-no-swipe
                style={{ padding: '12px 14px', fontSize: '15px' }}
              />
            </div>
            <p className="text-muted text-[11px] mt-3 text-center">Swipe to skip — you can add this later in Settings.</p>
          </Panel>

          {/* Panel 5 — about your business (VAT + employees). */}
          <Panel>
            <PanelHeader
              title="About your business"
              subtitle="Modules you don't need stay hidden. Flip these on later from Settings if your business grows into them."
            />
            <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
              <label className="flex items-center justify-between gap-3 py-3 cursor-pointer">
                <span className="flex items-center gap-2">
                  <Receipt size={14} style={{ color: 'var(--muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>I&apos;m VAT-registered</span>
                </span>
                <input
                  type="checkbox" className="w-5 h-5 accent-brand"
                  checked={vatRegistered}
                  onChange={(e) => setVatRegistered(e.target.checked)}
                  data-no-swipe
                />
              </label>
              <div style={{ borderTop: '1px solid var(--card-border)' }} />
              <label className="flex items-center justify-between gap-3 py-3 cursor-pointer">
                <span className="flex items-center gap-2">
                  <Users2 size={14} style={{ color: 'var(--muted)' }} />
                  <span className="text-sm" style={{ color: 'var(--foreground)' }}>I have employees on payroll</span>
                </span>
                <input
                  type="checkbox" className="w-5 h-5 accent-brand"
                  checked={hasEmployees}
                  onChange={(e) => setHasEmployees(e.target.checked)}
                  data-no-swipe
                />
              </label>
            </div>
          </Panel>

          {/* Panel 6 — dashboard density. */}
          <Panel>
            <PanelHeader
              title="I mostly want to…"
              subtitle="Affects which tools we show first. Change any time in Settings."
            />
            <div className="rounded-2xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--card-border)' }}>
              <div className="flex items-center gap-2 mb-3 ml-1">
                <LayoutGrid size={14} style={{ color: 'var(--muted)' }} />
                <p className="text-xs font-semibold text-muted uppercase tracking-widest">Dashboard density</p>
              </div>
              <div className="flex flex-col gap-2">
                {([
                  { value: 'simple', label: 'Run my till and stock', hint: 'Cash up, stock, prices' },
                  { value: 'full',   label: 'Manage the business books too', hint: 'Reports, invoices, payroll, assets' },
                  { value: 'unsure', label: "I'm not sure yet", hint: 'Start simple — switch later' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUsageStyle(opt.value)}
                    data-no-swipe
                    className="flex items-start gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.99]"
                    style={usageStyle === opt.value
                      ? { background: 'var(--pill-green-bg)', border: '1px solid rgba(0,200,150,0.4)' }
                      : { background: 'var(--card-bg)', border: '1px solid var(--card-border)' }
                    }
                  >
                    <span
                      className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={usageStyle === opt.value
                        ? { background: '#00C896' }
                        : { background: 'transparent', border: '1.5px solid var(--card-border)' }
                      }
                    >
                      {usageStyle === opt.value && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--btn-primary-text)' }} />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{opt.label}</p>
                      <p className="text-muted text-[11px] mt-0.5">{opt.hint}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          {/* Panel 7 — starter pack. Final step, no forward swipe — the
              two action buttons take the user into the app. */}
          <Panel>
            <PanelHeader
              title="Starter pack?"
              subtitle={`We'll load ~20 common ${categoryConfig.label.toLowerCase()} products with typical SA prices. You fill in the quantities.`}
            />
            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--pill-green-bg)', border: '1px solid var(--card-border)' }}
            >
              <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--foreground)' }}>{categoryConfig.emoji} Included</p>
              <p className="text-muted text-[11px] leading-relaxed">
                {category === 'spaza' && 'Bread, milk, sugar, rice, oil, eggs, Maggi noodles, Simba chips, Coke, Fanta, washing powder, airtime & more'}
                {category === 'general_dealer' && 'Bread, milk, sugar, rice, oil, eggs, water, baked beans, pilchards, tissues, toothpaste, airtime, data & more'}
                {category === 'food_stall' && 'Boerewors rolls, pap, chicken, vetkoek, Russians, atchaar, chakalaka, chips, magwinya, samp & beans & more'}
                {category === 'other' && 'Start fresh — add your own products from inventory.'}
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-4" data-no-swipe>
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
                className="w-full rounded-2xl py-3.5 text-sm font-semibold"
                style={{ background: 'var(--surface)', border: '1px solid var(--card-border)', color: 'var(--muted)', opacity: isPending ? 0.5 : 1 }}
              >
                {category === 'other' ? "Let's go →" : "I'll add my own"}
              </button>
            </div>
          </Panel>
        </div>
      </div>

      {/* Sticky bottom action bar — Back + Continue mirror the swipe
          gestures for users who prefer buttons. Hidden on the pack step,
          which has its own primary actions. */}
      {step !== 'pack' && (
        <footer
          className="px-5 pb-5 pt-3 flex items-center gap-3 flex-shrink-0"
          style={{ borderTop: '1px solid var(--card-border)' }}
          data-no-swipe
        >
          <button
            onClick={attemptPrev}
            disabled={stepIdx === 0 || isPending}
            aria-label="Back"
            className="w-12 h-12 rounded-2xl inline-flex items-center justify-center flex-shrink-0"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--card-border)',
              color: stepIdx === 0 ? 'var(--muted-dim)' : 'var(--foreground)',
              opacity: stepIdx === 0 ? 0.4 : 1,
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={attemptNext}
            disabled={!canAdvance()}
            className="flex-1 btn-primary inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ opacity: canAdvance() ? 1 : 0.5 }}
          >
            {isPending ? 'Saving…' : (
              <>
                Continue
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </footer>
      )}
    </div>
  )
}

/** Vertical-stack panel sized to the deck height. Uses 100% so each panel
 *  fills exactly the swipe-deck area, never overflows. Content that's too
 *  tall would visibly clip — that's by design (forces tighter copy). */
function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="w-full h-full flex-shrink-0 px-5 pt-2 pb-4 flex flex-col">
      {children}
    </div>
  )
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{title}</h2>
      <p className="text-muted text-[12px] leading-snug mt-1">{subtitle}</p>
    </div>
  )
}
