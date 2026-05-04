"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/infrastructure/supabase/client"
import { Download, Share } from "lucide-react"
import Wordmark from "@/components/Wordmark"

/**
 * Stoki sign-in / sign-up.
 *
 * One smart input, one button. Type an email → magic-link flow. Type a phone
 * number → OTP flow. We auto-detect via the `@` character. Supabase
 * `signInWithOtp` auto-creates the account on first send, so there's no
 * separate register / sign-in mode — the same path covers both.
 *
 * Click count for a returning user with a remembered identifier:
 *   1. Tap Continue (input is pre-filled, focused)
 *   2. Phone path → 6 OTP digits typed → auto-verifies on the 6th
 *   2. Email path → tap the magic link in their inbox
 *
 * For first-time users add: typing the identifier. No more clicks than that.
 */

const REMEMBER_KEY = "stoki_last_identifier"

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("27")) return `+${digits}`
  if (digits.startsWith("0")) return `+27${digits.slice(1)}`
  return `+27${digits}`
}

function detectKind(s: string): "email" | "phone" | "empty" {
  const v = s.trim()
  if (!v) return "empty"
  if (v.includes("@")) return "email"
  return "phone"
}

function isValid(s: string): boolean {
  const kind = detectKind(s)
  if (kind === "email") return s.includes("@") && s.includes(".")
  if (kind === "phone") return normalizePhone(s).length >= 12
  return false
}

/** Map cryptic Supabase / Twilio errors into something a spaza owner can act on. */
function friendlyError(raw: string): string {
  const r = raw.toLowerCase()
  if (r.includes("phone") && (r.includes("disabled") || r.includes("provider") || r.includes("not found"))) {
    return "Phone sign-in isn't switched on yet — try with email."
  }
  if (r.includes("rate")) return "Too many attempts — wait a minute and try again."
  if (r.includes("invalid") && r.includes("token")) return "That code didn't match. Check the SMS and try again."
  return raw
}

type Step = "input" | "sent-link" | "sent-otp"

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()

  const [identifier, setIdentifier] = useState("")
  const [step, setStep] = useState<Step>("input")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill the last-used identifier so returning users see their email/phone
  // ready to go and only need a single tap of Continue.
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) setIdentifier(saved)
  }, [])

  const kind = detectKind(identifier)
  const valid = isValid(identifier)
  const otpReady = otp.length === 6

  // ── Submit identifier ────────────────────────────────────────────
  async function submit() {
    if (!valid || loading) return
    setLoading(true)
    setError(null)
    localStorage.setItem(REMEMBER_KEY, identifier.trim())

    try {
      if (kind === "email") {
        const { error } = await supabase.auth.signInWithOtp({
          email: identifier.trim(),
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
        })
        if (error) setError(friendlyError(error.message))
        else setStep("sent-link")
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone: normalizePhone(identifier) })
        if (error) setError(friendlyError(error.message))
        else setStep("sent-otp")
      }
    } catch (e) {
      setError(e instanceof Error ? friendlyError(e.message) : "Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  // ── Verify OTP (auto-runs on 6th digit) ──────────────────────────
  async function verify(code: string) {
    if (code.length !== 6 || loading) return
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: normalizePhone(identifier),
        token: code,
        type: "sms",
      })
      if (error) {
        setError(friendlyError(error.message))
        setOtp("")
      } else {
        router.push("/dashboard")
      }
    } catch (e) {
      setError(e instanceof Error ? friendlyError(e.message) : "Couldn't verify the code. Try again.")
      setOtp("")
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6)
    setOtp(digits)
    if (digits.length === 6) verify(digits)
  }

  function reset() {
    setStep("input")
    setOtp("")
    setError(null)
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-12 min-h-screen">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center flex flex-col items-center">
          <Wordmark height={56} textColor="var(--foreground)" />
          <p className="mt-3 text-sm text-muted">Run your business. Ask stoki.</p>
        </div>

        <InstallPrompt />

        <div className="card rounded-3xl p-6">
          {step === "input" && (
            <>
              <h2 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>
                Sign in or sign up
              </h2>
              <p className="text-muted text-sm mb-5">
                One field. We&apos;ll figure out the rest.
              </p>

              <input
                type="text"
                inputMode={kind === "phone" ? "numeric" : kind === "email" ? "email" : "text"}
                autoComplete={kind === "phone" ? "tel" : "email"}
                placeholder="Email or cell number"
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setError(null) }}
                onKeyDown={(e) => { if (e.key === "Enter") submit() }}
                autoFocus
                className="input"
              />

              {/* Live hint — tells the user what's about to happen before they tap. */}
              <p className="text-muted text-[11px] mt-2 ml-1 min-h-[16px]">
                {kind === "email"  && "We'll email you a magic link."}
                {kind === "phone"  && (valid ? `We'll text a code to ${normalizePhone(identifier)}.` : "Type a SA cell number — e.g. 082 123 4567.")}
                {kind === "empty"  && "Use the email or phone you'd usually use."}
              </p>

              <button
                onClick={submit}
                disabled={!valid || loading}
                className="btn-primary mt-4 active:scale-[0.98] transition-transform"
                style={{ opacity: valid && !loading ? 1 : 0.5 }}
              >
                {loading ? "Sending…" : "Continue →"}
              </button>

              {error && <ErrorMsg error={error} />}

              <p className="text-center text-muted text-[11px] mt-5">
                By continuing you agree to our{" "}
                <a href="/privacy" className="underline">Privacy Policy</a>.
                We process your business data only to provide the service.
              </p>
            </>
          )}

          {step === "sent-link" && (
            <div className="text-center py-2">
              <div className="text-5xl mb-4" aria-hidden>📬</div>
              <h2 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>Check your email</h2>
              <p className="text-muted text-sm mb-5">
                We sent a magic link to <span className="font-medium" style={{ color: "var(--foreground)" }}>{identifier.trim()}</span>.
                Tap it to sign in — you can close this tab.
              </p>
              <button onClick={reset} className="text-muted text-xs underline">
                Wrong email? Try again
              </button>
            </div>
          )}

          {step === "sent-otp" && (
            <>
              <button onClick={reset} className="text-muted text-xs mb-4 flex items-center gap-1">
                ← {normalizePhone(identifier)}
              </button>
              <h2 className="text-lg font-bold mb-1" style={{ color: "var(--foreground)" }}>Enter the 6-digit code</h2>
              <p className="text-muted text-sm mb-5">
                Sent to <span style={{ color: "var(--foreground)" }}>{normalizePhone(identifier)}</span>. Auto-verifies when you finish typing.
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                autoFocus
                className="input"
                style={{ fontSize: "24px", letterSpacing: "0.3em", textAlign: "center" }}
              />
              <div className="mt-3 text-center min-h-[20px]">
                {loading && otpReady && <p className="text-muted text-xs">Verifying…</p>}
              </div>
              <button onClick={submit} disabled={loading} className="text-muted text-xs underline w-full text-center">
                Didn&apos;t get it? Resend code
              </button>
              {error && <ErrorMsg error={error} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const ErrorMsg = ({ error }: { error: string }) => (
  <p className="mt-4 text-sm text-center rounded-xl py-2 px-3"
    style={{ background: "var(--pill-red-bg)", color: "#ef4444", border: "1px solid var(--card-border)" }}>
    {error}
  </p>
)

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
    <div className="rounded-2xl p-4 mb-5" style={{ background: "var(--pill-green-bg)", border: "1px solid var(--card-border)" }}>
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
