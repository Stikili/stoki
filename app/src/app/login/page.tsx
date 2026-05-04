"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/infrastructure/supabase/client";
import { Download, Share } from "lucide-react";
import Wordmark from "@/components/Wordmark";

type Mode = "signin" | "register";
type Tab = "email" | "phone";
type PhoneStep = "number" | "otp";

const REMEMBER_KEY = "stoki_remember_email";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("27")) return `+${digits}`;
  if (digits.startsWith("0")) return `+27${digits.slice(1)}`;
  return `+27${digits}`;
}

const Logo = () => (
  <div className="mb-10 text-center flex flex-col items-center">
    <Wordmark height={56} textColor="var(--foreground)" />
    <p className="mt-3 text-sm text-muted">Run your business. Ask stoki.</p>
  </div>
)

const PrimaryBtn = ({ active, loading, label, loadingLabel, onClick, type = "button" }: {
  active: boolean; loading: boolean; label: string; loadingLabel: string;
  onClick?: () => void; type?: "button" | "submit"
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={loading || !active}
    className="btn-primary active:scale-[0.98] transition-transform"
    style={{ opacity: active && !loading ? 1 : 0.5 }}
  >
    {loading ? loadingLabel : label}
  </button>
)

const Checkbox = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <label className="flex items-center gap-2.5 cursor-pointer select-none">
    <div
      onClick={onChange}
      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
      style={checked
        ? { background: "#00C896", border: "1px solid #00C896" }
        : { background: "var(--surface)", border: "1px solid var(--card-border)" }
      }
    >
      {checked && (
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4L4 7L10 1" stroke="var(--btn-primary-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
    <span className="text-sm text-muted">{label}</span>
  </label>
)

const ErrorMsg = ({ error }: { error: string }) => (
  <p className="mt-4 text-sm text-center rounded-xl py-2 px-3" style={{ background: "var(--pill-red-bg)", color: "#ef4444", border: "1px solid var(--card-border)" }}>{error}</p>
)

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("email");
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("number");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  // Hydrate remembered email from localStorage; setState-in-effect is the
  // canonical SSR-safe pattern for browser-only state init.
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) { setEmail(saved); setRememberMe(true); }
  }, []);

  const normalised = normalizePhone(phone);
  const phoneValid = normalised.length >= 12;
  const otpValid = otp.length === 6;
  const emailValid = email.includes("@") && email.includes(".");
  const passwordValid = password.length >= 8;
  const formValid = emailValid && passwordValid && (mode === "signin" || (password === confirmPassword && consent));

  function clearError() { setError(null); setSuccess(null); }

  // ── Email + Password ──────────────────────────────────────────
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) return;
    setLoading(true);
    clearError();

    if (rememberMe) localStorage.setItem(REMEMBER_KEY, email);
    else localStorage.removeItem(REMEMBER_KEY);

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Account created! Check your email to confirm, then sign in.");
        setMode("signin");
        setPassword("");
        setConfirmPassword("");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("invalid")) {
          setError("Wrong email or password.");
        } else {
          setError(error.message);
        }
      } else {
        router.push("/dashboard");
      }
    }
    setLoading(false);
  }

  // ── Forgot password ───────────────────────────────────────────
  async function handleForgotPassword() {
    if (!forgotEmail.includes("@")) return;
    setLoading(true);
    clearError();
    const origin = window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
    });
    if (error) setError(error.message);
    else setForgotSent(true);
    setLoading(false);
  }

  // ── Phone OTP ─────────────────────────────────────────────────
  function humaniseOtpError(raw: string): string {
    // Supabase returns cryptic messages when Twilio Verify isn't configured
    // ("Phone signups disabled" / "Sms provider not found"). Surface a clearer
    // hint so users know to use email instead of staring at a useless error.
    const r = raw.toLowerCase()
    if (r.includes('phone') && (r.includes('disabled') || r.includes('provider') || r.includes('not found'))) {
      return 'Phone login is not enabled for this app yet. Please use email or password to sign in.'
    }
    return raw
  }

  async function sendOtp() {
    if (!phoneValid) return;
    setLoading(true);
    clearError();
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: normalised });
      if (error) setError(humaniseOtpError(error.message));
      else setPhoneStep("otp");
    } catch (e) {
      setError(e instanceof Error ? humaniseOtpError(e.message) : 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!otpValid) return;
    setLoading(true);
    clearError();
    try {
      const { error } = await supabase.auth.verifyOtp({ phone: normalised, token: otp, type: "sms" });
      if (error) setError(humaniseOtpError(error.message));
      else router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? humaniseOtpError(e.message) : 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Forgot password overlay ───────────────────────────────────
  if (showForgot) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 py-12 min-h-screen">
        <div className="w-full max-w-sm">
          <Logo />
          <div className="card rounded-3xl p-6">
            {forgotSent ? (
              <div className="text-center py-4">
                <div className="text-5xl mb-4">📬</div>
                <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>Check your email</h2>
                <p className="text-muted text-sm mb-6">We sent a reset link to <span className="font-medium" style={{ color: 'var(--foreground)' }}>{forgotEmail}</span></p>
                <button onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }} className="text-muted text-xs underline">
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <button onClick={() => { setShowForgot(false); clearError(); }} className="text-muted text-xs mb-4 flex items-center gap-1">← Back</button>
                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>Reset your password</h2>
                <p className="text-muted text-sm mb-5">Enter your email and we&apos;ll send a reset link.</p>
                <input
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
                  autoFocus
                  className="input mb-3"
                />
                <PrimaryBtn
                  active={forgotEmail.includes("@")} loading={loading}
                  label="Send reset link →" loadingLabel="Sending…"
                  onClick={handleForgotPassword}
                />
                {error && <ErrorMsg error={error} />}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-12 min-h-screen">
      <div className="w-full max-w-sm">
        <Logo />
        <InstallPrompt />

        <div className="card rounded-3xl p-6">

          {/* Tab switcher */}
          <div className="flex gap-1.5 p-1 rounded-2xl mb-6" style={{ background: "var(--surface)", border: "1px solid var(--card-border)" }}>
            {(["email", "phone"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); clearError(); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize"
                style={tab === t
                  ? { background: "var(--pill-green-bg)", color: "#00C896", border: "1px solid rgba(0,200,150,0.3)" }
                  : { color: "var(--muted)" }
                }
              >
                {t === "email" ? "Email" : "Cell number"}
              </button>
            ))}
          </div>

          {/* ── Email tab ── */}
          {tab === "email" && (
            <>
              {/* Sign in / Register toggle */}
              <div className="flex gap-1 mb-5">
                {(["signin", "register"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); clearError(); setPassword(""); setConfirmPassword(""); }}
                    className="text-sm font-semibold pb-2 transition-all"
                    style={{
                      color: mode === m ? "var(--foreground)" : "var(--muted)",
                      borderBottom: mode === m ? "2px solid #00C896" : "2px solid transparent",
                      marginRight: "16px",
                    }}
                  >
                    {m === "signin" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              {success && (
                <div className="rounded-xl px-4 py-3 text-sm mb-4" style={{ background: "var(--pill-green-bg)", color: "#00C896", border: "1px solid var(--card-border)" }}>
                  {success}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  inputMode="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  autoFocus
                  autoComplete="email"
                  className="input"
                />

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password (min. 8 characters)"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    className="input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-xs"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {mode === "register" && (
                  <>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                      autoComplete="new-password"
                      className="input"
                      style={confirmPassword && confirmPassword !== password
                        ? { borderColor: "rgba(239,68,68,0.5)" }
                        : undefined
                      }
                    />
                    <Checkbox
                      checked={consent}
                      onChange={() => setConsent(v => !v)}
                      label="I agree that Stoki may process my business data to provide the service."
                    />
                    <p className="text-xs -mt-1 ml-7" style={{ color: "var(--muted-dim)" }}>
                      Read our <a href="/privacy" className="underline text-muted">Privacy Policy</a>
                    </p>
                  </>
                )}

                <div className="flex items-center justify-between">
                  <Checkbox checked={rememberMe} onChange={() => setRememberMe((v) => !v)} label="Remember me" />
                  {mode === "signin" && (
                    <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email); clearError(); }} className="text-xs text-muted underline">
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="mt-1">
                  <PrimaryBtn
                    type="submit"
                    active={formValid}
                    loading={loading}
                    label={mode === "register" ? "Create account →" : "Sign in →"}
                    loadingLabel={mode === "register" ? "Creating…" : "Signing in…"}
                  />
                </div>
              </form>

              {error && <ErrorMsg error={error} />}
            </>
          )}

          {/* ── Phone tab ── */}
          {tab === "phone" && (
            <>
              {phoneStep === "number" && (
                <>
                  <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>
                    {mode === "register" ? "Register with cell" : "Sign in with cell"}
                  </h2>
                  <p className="text-muted text-sm mb-5">Enter your SA cellphone number</p>
                  <div className="flex gap-2 mb-4">
                    <div className="flex items-center justify-center px-3 rounded-xl flex-shrink-0 font-semibold text-sm" style={{ background: "var(--surface)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}>
                      🇿🇦 +27
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="82 000 0000"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); clearError(); }}
                      onKeyDown={(e) => e.key === "Enter" && phoneValid && sendOtp()}
                      autoFocus
                      className="input flex-1"
                    />
                  </div>
                  <Checkbox checked={rememberMe} onChange={() => setRememberMe((v) => !v)} label="Remember this number" />
                  <div className="mt-2">
                    <Checkbox
                      checked={consent}
                      onChange={() => setConsent(v => !v)}
                      label="I agree that Stoki may process my business data to provide the service."
                    />
                    <p className="text-xs mt-1 ml-7" style={{ color: "var(--muted-dim)" }}>
                      Read our <a href="/privacy" className="underline text-muted">Privacy Policy</a>
                    </p>
                  </div>
                  <div className="mt-4">
                    <PrimaryBtn active={phoneValid && consent} loading={loading} label="Send OTP →" loadingLabel="Sending…" onClick={sendOtp} />
                  </div>
                </>
              )}

              {phoneStep === "otp" && (
                <>
                  <button onClick={() => { setPhoneStep("number"); setOtp(""); clearError(); }} className="text-muted text-xs mb-4 flex items-center gap-1">
                    ← {normalised}
                  </button>
                  <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>Enter the code</h2>
                  <p className="text-muted text-sm mb-5">We sent a 6-digit code to <span style={{ color: 'var(--foreground)' }}>{normalised}</span></p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); clearError(); }}
                    onKeyDown={(e) => e.key === "Enter" && otpValid && verifyOtp()}
                    autoFocus
                    className="input mb-3"
                    style={{ fontSize: "24px", letterSpacing: "0.3em", textAlign: "center" }}
                  />
                  <PrimaryBtn active={otpValid} loading={loading} label="Verify →" loadingLabel="Verifying…" onClick={verifyOtp} />
                  <div className="mt-4 text-center">
                    <button onClick={() => { setOtp(""); sendOtp(); }} className="text-muted text-xs underline" disabled={loading}>Resend code</button>
                  </div>
                </>
              )}

              {error && <ErrorMsg error={error} />}
            </>
          )}
        </div>

        <p className="text-center text-muted text-xs mt-6">
          By continuing you agree to our{" "}
          <span className="underline">Terms</span>{" "}
          &amp;{" "}
          <span className="underline">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}

function InstallPrompt() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deferredPrompt = useRef<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('stoki_install_dismissed')) return

    // iOS detection — needs navigator API, must run client-side post-mount.
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ios) { setIsIOS(true); setShowInstall(true); return }

    // Android/Chrome: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!deferredPrompt.current) return
    deferredPrompt.current.prompt()
    const result = await deferredPrompt.current.userChoice
    if (result.outcome === 'accepted') setShowInstall(false)
    deferredPrompt.current = null
  }

  function dismiss() {
    setDismissed(true)
    setShowInstall(false)
    localStorage.setItem('stoki_install_dismissed', '1')
  }

  if (!showInstall || dismissed) return null

  return (
    <div className="rounded-2xl p-4 mb-5" style={{ background: 'var(--pill-green-bg)', border: '1px solid var(--card-border)' }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#00C896' }}>
          <Download size={20} color="white" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>Install stoki</p>
          <p className="text-sm mt-1 text-muted">
            {isIOS
              ? <>Tap <Share size={14} className="inline -mt-0.5" /> then <strong>&quot;Add to Home Screen&quot;</strong></>
              : 'Add to your home screen for the best experience.'
            }
          </p>
        </div>
        <button onClick={dismiss} className="text-lg min-h-0 w-8 h-8 flex items-center justify-center flex-shrink-0 text-muted">×</button>
      </div>
      {!isIOS && (
        <button onClick={install}
          className="w-full mt-3 py-3 rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform"
          style={{ background: '#00C896', color: 'var(--btn-primary-text)' }}>
          Install App
        </button>
      )}
    </div>
  )
}
