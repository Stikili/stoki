"use client";

import { useState } from "react";
import { createClient } from "@/infrastructure/supabase/client";
import { useRouter } from "next/navigation";
import { Bot } from "lucide-react";

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
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-12 min-h-screen">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#00C896' }}>
            <Bot size={36} color="white" strokeWidth={1.75} />
          </div>
          <h1 className="text-4xl font-black tracking-tight lowercase" style={{ color: 'var(--foreground)' }}>
            stoki
          </h1>
        </div>

        <div className="card rounded-3xl p-6">
          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--pill-green-bg)", border: "1px solid var(--card-border)" }}>
                <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
                  <path d="M2 11L10 19L26 3" stroke="#00C896" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--foreground)' }}>Password updated</h2>
              <p className="text-muted text-sm">Taking you to your dashboard…</p>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--foreground)' }}>Set a new password</h2>
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

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  className="input"
                  style={confirm && confirm !== password ? { borderColor: "rgba(239,68,68,0.5)" } : undefined}
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
                        ? { background: "var(--pill-green-bg)", color: "#00C896", border: "1px solid var(--card-border)" }
                        : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--card-border)" }
                      }
                    >
                      {met && <span>✓</span>} {label}
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || !valid}
                  className="btn-primary active:scale-[0.98] transition-transform mt-2"
                  style={{ opacity: valid && !loading ? 1 : 0.5 }}
                >
                  {loading ? "Updating…" : "Update password →"}
                </button>
              </form>

              {error && (
                <p className="mt-4 text-sm text-center rounded-xl py-2 px-3" style={{ background: "var(--pill-red-bg)", color: "#ef4444", border: "1px solid var(--card-border)" }}>
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
