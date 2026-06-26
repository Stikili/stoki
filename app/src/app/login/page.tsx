"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/infrastructure/supabase/client"
import { Download, Share, Loader2, Eye, EyeOff, ArrowLeft, Smartphone } from "lucide-react"
import Wordmark from "@/components/Wordmark"

/**
 * Stoki sign-in / sign-up. Two explicit auth paths:
 *   email + password    (primary, default)
 *   phone + OTP         (secondary, accessed via "OTP — SA cell number" button)
 *
 * Layout: labelled fields above placeholders (clearer than placeholder-only),
 * Remember-me + Forgot-password row, primary CTA, then a divider with the
 * alt OTP button. "Create a free account" link at the bottom toggles into
 * register intent.
 */

type AuthMode = "email" | "phone"
type Intent = "signin" | "register"
type PhoneStep = "idle" | "otp"

const REMEMBER_KEY = "stoki_last_identifier"

/** Feature flag: surface the phone-OTP login path in the UI.
 *  Set to `false` until a SMS provider (Twilio / MessageBird / Vonage) is
 *  wired in Supabase Dashboard → Authentication → Phone Auth. When off:
 *   - the "OTP — SA cell number" alt-button is hidden
 *   - the auth mode is hard-locked to "email"
 *   - returning users with a remembered phone identifier are still placed
 *     in email mode (so they don't dead-end in a hidden path)
 *  All sendOtp / verifyOtp code below is intact — flipping this to `true`
 *  re-enables the path with no other changes. See
 *  [[phone-otp-deferred]] memory for the re-enable runbook. */
const PHONE_OTP_ENABLED = false

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("27")) return `+${digits}`
  if (digits.startsWith("0")) return `+27${digits.slice(1)}`
  return `+27${digits}`
}

function detectKindFromText(s: string): "email" | "phone" | "empty" {
  const v = s.trim()
  if (!v) return "empty"
  if (v.includes("@")) return "email"
  return "phone"
}

function humaniseOtpError(raw: string): string {
  const r = raw.toLowerCase()
  if (r.includes("phone") && (r.includes("disabled") || r.includes("provider") || r.includes("not found"))) {
    return "Phone sign-in isn't switched on yet — try with email."
  }
  if (r.includes("rate")) return "Too many attempts — wait a minute and try again."
  if (r.includes("invalid") && r.includes("token")) return "That code didn't match. Check the SMS and try again."
  return raw
}

// ── Visual primitives ───────────────────────────────────────────────────────

/** Animated background — three drifting orbs (teal / blue / amber) plus a
 *  static scanline overlay. All driven by CSS keyframes defined inside the
 *  `.stoki-login` scope in globals.css, so swapping or disabling them is a
 *  single-place change. `prefers-reduced-motion` halts the drift. */
const Scene = () => (
  <>
    <div className="scene" aria-hidden>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
    <div className="scanlines" aria-hidden />
  </>
)

/** Small uppercase label sitting above each field — adds clarity without
 *  relying on placeholder-only-when-empty patterns. Uses the tertiary text
 *  token (--muted-dim) since labels are quieter than body copy. */
const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "var(--muted-dim)" }}>
    {children}
  </label>
)

/** Glossy input — frosted base + emerald focus glow. */
function Field({
  value, onChange, placeholder, type = "text", inputMode, autoComplete, autoFocus,
  onKeyDown, suffix, error,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  type?: string
  inputMode?: "text" | "email" | "numeric" | "tel"
  autoComplete?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  suffix?: React.ReactNode
  error?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const focusClass = error ? "field-gloss-error" : focused ? "field-gloss-focus" : ""
  return (
    <div className={`field-gloss ${focusClass} relative`}>
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        className="relative z-10 w-full bg-transparent outline-none px-4 py-3.5 text-base"
        style={{ color: "var(--foreground)" }}
      />
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center">
          {suffix}
        </div>
      )}
    </div>
  )
}

/** Primary CTA — emerald, full-width. Disabled state is muted but still legible. */
function PrimaryBtn({
  active, loading, label, loadingLabel, onClick, type = "button",
}: {
  active: boolean; loading: boolean; label: string; loadingLabel: string
  onClick?: () => void; type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || !active}
      className="btn-gloss w-full rounded-2xl py-3.5 font-semibold text-[15px] inline-flex items-center justify-center gap-2"
    >
      {loading && <Loader2 size={16} className="animate-spin relative z-10" />}
      <span className="relative z-10">{loading ? loadingLabel : label}</span>
    </button>
  )
}

const Checkbox = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none min-h-0">
    <div
      onClick={onChange}
      className="w-[18px] h-[18px] rounded-md flex items-center justify-center flex-shrink-0 transition-all"
      style={checked
        ? { background: "#00C896", border: "1px solid #00C896" }
        : { background: "var(--surface)", border: "1px solid var(--card-border)" }}
    >
      {checked && (
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4L4 7L10 1" stroke="var(--btn-primary-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <span className="text-[13px]" style={{ color: "var(--muted)" }}>{label}</span>
  </label>
)

const ErrorMsg = ({ error }: { error: string }) => (
  <p
    role="alert"
    className="text-sm rounded-xl py-2.5 px-3 mt-3"
    style={{ background: "rgba(239, 68, 68, 0.10)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.25)" }}
  >
    {error}
  </p>
)

const SuccessMsg = ({ msg }: { msg: string }) => (
  <div
    className="rounded-xl px-4 py-3 text-sm mb-4 inline-flex items-start gap-2"
    style={{ background: "rgba(0, 200, 150, 0.10)", color: "#00C896", border: "1px solid rgba(0, 200, 150, 0.25)" }}
  >
    <span aria-hidden>✓</span>
    <span>{msg}</span>
  </div>
)

/** Centred "OR CONTINUE WITH" divider — flanking lines + uppercase label. */
function OrDivider({ label = "OR CONTINUE WITH" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-5" aria-hidden>
      <div className="flex-1 h-px" style={{ background: "var(--card-border)" }} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--muted-dim)" }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--card-border)" }} />
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const supabase = createClient()
  const router = useRouter()
  const sp = useSearchParams()

  const [mode, setMode] = useState<AuthMode>("email")
  // Honour `/login?intent=register` from the landing page's "Sign up free"
  // CTA so the user lands directly in Create-account mode.
  const [intent, setIntent] = useState<Intent>(sp.get("intent") === "register" ? "register" : "signin")
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("idle")
  const [rememberMe, setRememberMe] = useState(false)
  const [consent, setConsent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotSent, setForgotSent] = useState(false)

  // Pre-fill the last-used identifier and switch to its native mode so the
  // returning user lands in the right form path without doing anything.
  // While PHONE_OTP_ENABLED is off, the mode is always "email" — a
  // returning user whose saved identifier is a phone number still lands
  // in email mode (rather than a hidden / broken phone path).
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      setIdentifier(saved)
      setRememberMe(true)
      if (PHONE_OTP_ENABLED) {
        setMode(detectKindFromText(saved) === "phone" ? "phone" : "email")
      }
    }
  }, [])

  const detectedKind = detectKindFromText(identifier)
  const normalisedPhone = mode === "phone" ? normalizePhone(identifier) : ""
  const phoneValid = mode === "phone" && normalisedPhone.length >= 12
  const emailValid = mode === "email" && identifier.includes("@") && identifier.includes(".")
  const passwordValid = password.length >= 8
  const otpValid = otp.length === 6

  const emailFormValid = emailValid && passwordValid
    && (intent === "signin" || (password === confirmPassword && consent))

  function clearMessages() { setError(null); setSuccess(null) }

  function switchToPhone() {
    setMode("phone")
    setPassword("")
    setConfirmPassword("")
    clearMessages()
    // If they typed an email, clear it so the phone field starts blank.
    if (detectedKind === "email") setIdentifier("")
  }

  function switchToEmail() {
    setMode("email")
    setPhoneStep("idle")
    setOtp("")
    clearMessages()
    if (detectedKind === "phone") setIdentifier("")
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (loading) return
    if (mode === "email") {
      if (!emailFormValid) return
      await handleEmailSubmit()
    } else {
      if (phoneStep === "idle") {
        if (!phoneValid) return
        await sendOtp()
      } else if (phoneStep === "otp") {
        if (!otpValid) return
        await verifyOtp(otp)
      }
    }
  }

  async function handleEmailSubmit() {
    setLoading(true); clearMessages()
    if (rememberMe) localStorage.setItem(REMEMBER_KEY, identifier.trim())
    else localStorage.removeItem(REMEMBER_KEY)

    if (intent === "register") {
      const { error } = await supabase.auth.signUp({ email: identifier.trim(), password })
      if (error) setError(error.message)
      else {
        setSuccess("Account created — check your email to confirm, then sign in.")
        setIntent("signin"); setPassword(""); setConfirmPassword("")
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: identifier.trim(), password })
      if (error) {
        setError(error.message.toLowerCase().includes("invalid") ? "Wrong email or password." : error.message)
      } else {
        router.push("/dashboard")
      }
    }
    setLoading(false)
  }

  async function sendOtp() {
    setLoading(true); clearMessages()
    if (rememberMe) localStorage.setItem(REMEMBER_KEY, identifier.trim())
    else localStorage.removeItem(REMEMBER_KEY)
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: normalisedPhone })
      if (error) setError(humaniseOtpError(error.message))
      else setPhoneStep("otp")
    } catch (e) {
      setError(e instanceof Error ? humaniseOtpError(e.message) : "Failed to send code. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function verifyOtp(code: string) {
    setLoading(true); clearMessages()
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: normalisedPhone, token: code, type: "sms" })
      if (error) {
        setError(humaniseOtpError(error.message))
        setOtp("")
      } else {
        router.push("/dashboard")
      }
    } catch (e) {
      setError(e instanceof Error ? humaniseOtpError(e.message) : "Failed to verify code. Please try again.")
      setOtp("")
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6)
    setOtp(digits)
    if (digits.length === 6) verifyOtp(digits)
  }

  async function handleForgotPassword() {
    if (!forgotEmail.includes("@")) return
    setLoading(true); clearMessages()
    const origin = window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
    })
    if (error) setError(error.message)
    else setForgotSent(true)
    setLoading(false)
  }

  // ── Forgot password overlay ─────────────────────────────────────────────
  if (showForgot) {
    return (
      <div className="stoki-login flex flex-col flex-1 items-center justify-center px-5 py-10 min-h-screen relative">
        <Scene />
        <div className="w-full max-w-[460px] relative" style={{ zIndex: 2 }}>
          <Card>
            {forgotSent ? (
              <div className="text-center py-2">
                <div className="text-5xl mb-4" aria-hidden>📬</div>
                <h2 className="stoki-display text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>Check your email</h2>
                <p className="text-muted text-sm mb-6">
                  We sent a reset link to <span className="font-medium" style={{ color: "var(--foreground)" }}>{forgotEmail}</span>
                </p>
                <button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail("") }} className="text-muted text-xs underline">
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => { setShowForgot(false); clearMessages() }} className="text-muted text-xs mb-4 inline-flex items-center gap-1">
                  <ArrowLeft size={12} /> Back
                </button>
                <h2 className="stoki-display text-2xl font-bold mb-1" style={{ color: "var(--foreground)" }}>Reset your password</h2>
                <p className="text-muted text-sm mb-5">Enter your email and we&apos;ll send a reset link.</p>
                <FieldLabel>Email address</FieldLabel>
                <Field
                  type="email"
                  inputMode="email"
                  placeholder="name@stoki.app"
                  value={forgotEmail}
                  onChange={setForgotEmail}
                  onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                  autoFocus
                />
                <div className="mt-4">
                  <PrimaryBtn
                    active={forgotEmail.includes("@")} loading={loading}
                    label="Send reset link" loadingLabel="Sending…"
                    onClick={handleForgotPassword}
                  />
                </div>
                {error && <ErrorMsg error={error} />}
              </>
            )}
          </Card>
        </div>
      </div>
    )
  }

  // ── Main screen ─────────────────────────────────────────────────────────
  const heading =
    mode === "phone"
      ? phoneStep === "otp" ? "Enter the code" : "Sign in with your phone"
      : intent === "register" ? "Create your account" : "Welcome back"
  const subtitle =
    mode === "phone"
      ? phoneStep === "otp" ? `We texted a 6-digit code to ${normalisedPhone}` : "We'll text you a one-time code."
      : intent === "register" ? "Start running your shop with stoki" : "Sign in to your stoki account"

  const isOtpStep = mode === "phone" && phoneStep === "otp"

  return (
    <div className="stoki-login flex flex-col flex-1 items-center justify-center px-5 py-10 min-h-screen relative">
      <Scene />
      <div className="w-full max-w-[460px] relative" style={{ zIndex: 2 }}>
        <InstallPrompt />

        <Card>
          {isOtpStep ? (
            <OtpStep
              normalisedPhone={normalisedPhone}
              otp={otp}
              loading={loading}
              error={error}
              onChange={handleOtpChange}
              onResend={() => sendOtp()}
              onBack={() => { setPhoneStep("idle"); setOtp(""); clearMessages() }}
            />
          ) : (
            <div className="stagger">
              {/* 1 — Logo row (existing Wordmark). Centred. */}
              <div className="flex items-center justify-center mb-9">
                <Wordmark height={42} textColor="var(--foreground)" />
              </div>

              {/* 2 — Header (title + sub) */}
              <div className="text-center mb-9">
                <h1 className="stoki-display text-2xl font-bold mb-2" style={{ color: "var(--foreground)" }}>
                  {heading}
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {subtitle}
                </p>
              </div>

              {/* 4 — Fields */}
              <form onSubmit={submit} className="flex flex-col gap-3.5 mb-5">
                <div className="flex flex-col gap-[7px]">
                  <FieldLabel>{mode === "phone" ? "SA cell number" : "Email or SA number"}</FieldLabel>
                  <Field
                    type="text"
                    inputMode={mode === "phone" ? "tel" : "email"}
                    autoComplete={mode === "phone" ? "tel" : "email"}
                    placeholder={mode === "phone" ? "+27 72 000 0000" : "+27 72 000 0000 or name@stoki.app"}
                    value={identifier}
                    onChange={(v) => { setIdentifier(v); clearMessages() }}
                    autoFocus
                  />
                </div>

                {mode === "email" && (
                  <div className="flex flex-col gap-[7px]">
                    <FieldLabel>Password</FieldLabel>
                    <Field
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      value={password}
                      onChange={(v) => { setPassword(v); clearMessages() }}
                      autoComplete={intent === "register" ? "new-password" : "current-password"}
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="p-1 min-h-0"
                          style={{ color: "var(--muted-dim)" }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                  </div>
                )}

                {mode === "email" && intent === "register" && (
                  <>
                    <div className="flex flex-col gap-[7px]">
                      <FieldLabel>Confirm password</FieldLabel>
                      <Field
                        type={showPassword ? "text" : "password"}
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(v) => { setConfirmPassword(v); clearMessages() }}
                        autoComplete="new-password"
                        error={!!confirmPassword && confirmPassword !== password}
                      />
                    </div>
                    <Checkbox
                      checked={consent}
                      onChange={() => setConsent(v => !v)}
                      label="I agree that Stoki may process my business data to provide the service."
                    />
                  </>
                )}
              </form>

              {/* 5 — Remember + Forgot row (signin only) / Remember number (phone) */}
              {mode === "email" && intent === "signin" && (
                <div className="flex items-center justify-between mb-7">
                  <Checkbox checked={rememberMe} onChange={() => setRememberMe(v => !v)} label="Remember me" />
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setForgotEmail(identifier); clearMessages() }}
                    className="text-[13px] font-medium min-h-0"
                    style={{ color: "#00c98d" }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}
              {mode === "phone" && phoneStep === "idle" && (
                <div className="mb-7">
                  <Checkbox checked={rememberMe} onChange={() => setRememberMe(v => !v)} label="Remember this number" />
                </div>
              )}

              {/* 6 — Actions: primary CTA, divider, alt-path */}
              <div className="flex flex-col gap-2.5">
                {success && <SuccessMsg msg={success} />}
                <PrimaryBtn
                  type="button"
                  active={mode === "email" ? emailFormValid : phoneValid}
                  loading={loading}
                  label={mode === "phone" ? "Send code" : intent === "register" ? "Create account" : "Sign in"}
                  loadingLabel={mode === "phone" ? "Sending…" : intent === "register" ? "Creating…" : "Signing in…"}
                  onClick={() => submit()}
                />
                {PHONE_OTP_ENABLED && <OrDivider />}
                {PHONE_OTP_ENABLED && (mode === "email" ? (
                  <button type="button" onClick={switchToPhone} className="btn-outline">
                    <Smartphone size={15} strokeWidth={1.7} />
                    OTP — SA cell number
                  </button>
                ) : (
                  <button type="button" onClick={switchToEmail} className="btn-outline">
                    <ArrowLeft size={15} strokeWidth={2} />
                    Use email &amp; password
                  </button>
                ))}
                {error && <ErrorMsg error={error} />}
              </div>

              {/* 7 — Footer */}
              <div className="text-center mt-7">
                {mode === "email" && (
                  <p className="text-[13px]" style={{ color: "var(--muted-dim)" }}>
                    {intent === "signin" ? "New to stoki?" : "Already have an account?"}{" "}
                    <button
                      type="button"
                      onClick={() => { setIntent(i => i === "signin" ? "register" : "signin"); clearMessages(); setPassword(""); setConfirmPassword("") }}
                      className="font-medium min-h-0"
                      style={{ color: "#00c98d" }}
                    >
                      {intent === "signin" ? "Create a free account" : "Sign in"}
                    </button>
                  </p>
                )}
                <p className="mt-4 text-[10.5px] leading-relaxed" style={{ color: "rgba(74, 88, 120, 0.6)" }}>
                  By signing in you agree to our{" "}
                  <a href="/privacy" className="underline" style={{ color: "var(--muted-dim)" }}>Privacy Policy</a>
                  {" "}&amp;{" "}
                  <a href="/terms" className="underline" style={{ color: "var(--muted-dim)" }}>Terms of Service</a>
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

/** Frosted glass card — top specular line, soft drop, refined inner shadows. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-glass p-7">
      {children}
    </div>
  )
}

/** OTP entry step — large, centred, auto-verifying field plus resend. */
function OtpStep({
  normalisedPhone, otp, loading, error,
  onChange, onResend, onBack,
}: {
  normalisedPhone: string
  otp: string
  loading: boolean
  error: string | null
  onChange: (v: string) => void
  onResend: () => void
  onBack: () => void
}) {
  return (
    <>
      <button onClick={onBack} className="text-muted text-xs mb-4 inline-flex items-center gap-1">
        <ArrowLeft size={12} /> {normalisedPhone}
      </button>
      <div className="field-gloss field-gloss-focus relative">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          value={otp}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          className="relative z-10 w-full bg-transparent outline-none px-5 py-5 font-mono"
          style={{
            color: "var(--foreground)",
            fontSize: "30px",
            letterSpacing: "0.4em",
            textAlign: "center",
          }}
        />
      </div>
      <div className="mt-5 text-center">
        {loading && otp.length === 6 ? (
          <p className="text-muted text-xs inline-flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" /> Verifying…
          </p>
        ) : (
          <button onClick={onResend} className="text-muted text-xs underline" disabled={loading}>
            Didn&apos;t get it? Resend code
          </button>
        )}
      </div>
      {error && <ErrorMsg error={error} />}
    </>
  )
}

function InstallPrompt() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deferredPrompt = useRef<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return
    if (localStorage.getItem("stoki_install_dismissed")) return

    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ios) { setIsIOS(true); setShowInstall(true); return }

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e
      setShowInstall(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  async function install() {
    if (!deferredPrompt.current) return
    deferredPrompt.current.prompt()
    const result = await deferredPrompt.current.userChoice
    if (result.outcome === "accepted") setShowInstall(false)
    deferredPrompt.current = null
  }

  function dismiss() {
    setDismissed(true)
    setShowInstall(false)
    localStorage.setItem("stoki_install_dismissed", "1")
  }

  if (!showInstall || dismissed) return null

  return (
    <div className="rounded-2xl p-4 mb-5"
      style={{
        background: "linear-gradient(180deg, rgba(0, 200, 150, 0.10) 0%, rgba(0, 200, 150, 0.04) 100%)",
        border: "1px solid rgba(0, 200, 150, 0.20)",
      }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#00C896" }}>
          <Download size={20} color="white" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>Install stoki</p>
          <p className="text-sm mt-1 text-muted">
            {isIOS
              ? <>Tap <Share size={14} className="inline -mt-0.5" /> then <strong>&quot;Add to Home Screen&quot;</strong></>
              : "Add to your home screen for the best experience."}
          </p>
        </div>
        <button onClick={dismiss} className="text-lg min-h-0 w-8 h-8 flex items-center justify-center flex-shrink-0 text-muted">×</button>
      </div>
      {!isIOS && (
        <button onClick={install}
          className="w-full mt-3 py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
          style={{ background: "#00C896", color: "var(--btn-primary-text)" }}>
          Install App
        </button>
      )}
    </div>
  )
}
