"use client";

import { useState } from "react";
import { createClient } from "@/infrastructure/supabase/client";
import { useRouter } from "next/navigation";

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "14px",
  padding: "14px 16px",
  color: "white",
  fontSize: "16px",
  outline: "none",
  width: "100%",
} as const;

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const valid = password.length >= 8 && password === confirm;

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2500);
    }
    setLoading(false);
  }

  return (
    <div
      className="flex flex-col flex-1 items-center justify-center px-6 py-12 min-h-screen"
      style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,200,150,0.1) 0%, transparent 60%)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center flex flex-col items-center">
          <div style={{ filter: "drop-shadow(0 0 20px rgba(0,200,150,0.4))" }} className="mb-4">
            <svg width="56" height="56" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="20" fill="#00C896"/>
              <polyline points="7,27 13,20 18,23 24,13 33,16" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="33" cy="16" r="2" fill="white"/>
            </svg>
          </div>
          <h1
            className="text-4xl font-black tracking-tight lowercase"
            style={{ background: "linear-gradient(135deg, #ffffff 0%, #a8f0da 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
          >
            stoki
          </h1>
        </div>

        <div
          className="rounded-3xl p-6"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 0 60px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.08) inset", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        >
          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(0,200,150,0.15)", border: "1px solid rgba(0,200,150,0.3)" }}>
                <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
                  <path d="M2 11L10 19L26 3" stroke="#00C896" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Password updated</h2>
              <p className="text-muted text-sm">Taking you to your dashboard…</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-white mb-1">Set a new password</h2>
              <p className="text-muted text-sm mb-5">Choose something strong that you&apos;ll remember.</p>

              <form onSubmit={handleReset} className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password (min. 8 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    autoComplete="new-password"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-xs"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  style={{
                    ...inputStyle,
                    border: confirm && confirm !== password
                      ? "1px solid rgba(239,68,68,0.5)"
                      : inputStyle.border,
                  }}
                />

                {/* Strength hints */}
                <div className="flex gap-1.5 mt-0.5">
                  {[
                    { label: "8+ chars", met: password.length >= 8 },
                    { label: "Matches", met: password.length > 0 && password === confirm },
                  ].map(({ label, met }) => (
                    <div
                      key={label}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                      style={met
                        ? { background: "rgba(0,200,150,0.12)", color: "#00C896", border: "1px solid rgba(0,200,150,0.2)" }
                        : { background: "rgba(255,255,255,0.04)", color: "#5a7a94", border: "1px solid rgba(255,255,255,0.07)" }
                      }
                    >
                      {met && <span>✓</span>} {label}
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || !valid}
                  className="w-full relative overflow-hidden active:scale-[0.98] transition-transform mt-2"
                  style={{
                    background: valid && !loading ? "linear-gradient(135deg, #00C896 0%, #00a87e 100%)" : "rgba(0,200,150,0.25)",
                    boxShadow: valid && !loading ? "0 0 28px rgba(0,200,150,0.4), 0 1px 0 rgba(255,255,255,0.25) inset" : "none",
                    borderRadius: "14px", padding: "15px", color: "#080f1a", fontWeight: 700, fontSize: "16px",
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)", borderRadius: "inherit" }} />
                  {loading ? "Updating…" : "Update password →"}
                </button>
              </form>

              {error && (
                <p className="mt-4 text-sm text-center rounded-xl py-2 px-3" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
