'use client'

import { useState, useTransition } from 'react'
import { Alert } from '@/domain/entities/alert'
import { markAlertReadAction, markAllReadAction, createAlertAction } from './actions'

const typeConfig: Record<Alert['type'], { icon: string; color: string; glow: string }> = {
  out_of_stock: { icon: '🔴', color: '#ef4444', glow: 'rgba(239,68,68,0.15)' },
  low_stock:    { icon: '🟡', color: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
  ai_insight:   { icon: '💡', color: '#c084fc', glow: 'rgba(192,132,252,0.15)' },
  debtor:       { icon: '💳', color: '#fb923c', glow: 'rgba(251,146,60,0.15)' },
  weekly_report:{ icon: '📊', color: '#60a5fa', glow: 'rgba(96,165,250,0.15)' },
}

const typeLabel: Record<Alert['type'], string> = {
  out_of_stock: 'Out of Stock', low_stock: 'Low Stock',
  ai_insight: 'AI Insight', debtor: 'Credit Alert', weekly_report: 'Weekly Report',
}

const CREATABLE_TYPES: Alert['type'][] = ['debtor', 'ai_insight']

const sheetStyle = {
  background: 'rgba(8,18,32,0.97)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderTop: '1px solid rgba(255,255,255,0.1)',
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white',
  borderRadius: '14px',
  padding: '14px 16px',
  fontSize: '15px',
  outline: 'none',
  width: '100%',
  resize: 'none' as const,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AlertsClient({ alerts }: { alerts: Alert[] }) {
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedType, setSelectedType] = useState<Alert['type']>('debtor')

  function markRead(alertId: string) {
    startTransition(() => markAlertReadAction(alertId))
  }

  function markAllRead() {
    startTransition(() => markAllReadAction())
  }

  function handleCreate(formData: FormData) {
    formData.set('type', selectedType)
    startTransition(async () => {
      await createAlertAction(formData)
      setShowCreate(false)
    })
  }

  const unread = alerts.filter((a) => !a.readAt)
  const read = alerts.filter((a) => a.readAt)

  return (
    <>
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <span className="text-3xl">🔔</span>
          </div>
          <p className="text-white font-semibold mb-1">All clear</p>
          <p className="text-muted text-sm">No alerts right now. Start selling and we&apos;ll keep watch.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {unread.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-muted text-xs font-semibold uppercase tracking-widest">New</p>
                <button
                  onClick={markAllRead}
                  disabled={isPending}
                  className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(0,200,150,0.1)', color: '#00C896', border: '1px solid rgba(0,200,150,0.2)', opacity: isPending ? 0.5 : 1 }}
                >
                  Mark all read
                </button>
              </div>
              {unread.map((a) => {
                const cfg = typeConfig[a.type]
                return (
                  <button
                    key={a.id}
                    onClick={() => markRead(a.id)}
                    disabled={isPending}
                    className="w-full text-left rounded-2xl p-4 active:scale-[0.98] transition-transform"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid rgba(255,255,255,0.1)`,
                      boxShadow: `0 0 20px ${cfg.glow}, 0 1px 0 rgba(255,255,255,0.08) inset`,
                      borderLeft: `3px solid ${cfg.color}`,
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold" style={{ color: cfg.color }}>{typeLabel[a.type]}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
                          <span className="text-muted text-xs ml-auto">{timeAgo(a.createdAt)}</span>
                        </div>
                        <p className="text-white text-sm">{a.message}</p>
                        <p className="text-muted text-xs mt-1">Tap to dismiss</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </>
          )}

          {read.length > 0 && (
            <>
              <p className="text-muted text-xs font-semibold uppercase tracking-widest mt-4 mb-2">Earlier</p>
              {read.map((a) => {
                const cfg = typeConfig[a.type]
                return (
                  <div
                    key={a.id}
                    className="rounded-2xl p-4 opacity-40"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{cfg.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-muted">{typeLabel[a.type]}</span>
                          <span className="text-muted text-xs ml-auto">{timeAgo(a.createdAt)}</span>
                        </div>
                        <p className="text-white text-sm">{a.message}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-28 right-5 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg z-40"
        style={{ background: 'linear-gradient(135deg, #00C896, #00a87e)', boxShadow: '0 0 20px rgba(0,200,150,0.4), 0 1px 0 rgba(255,255,255,0.25) inset', color: '#080f1a' }}
      >+</button>

      {/* Create alert sheet */}
      {showCreate && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowCreate(false)} />
          <div className="relative rounded-t-3xl p-6 pb-10" style={sheetStyle}>
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <h2 className="text-lg font-bold text-white mb-5">New Alert</h2>
            <form action={handleCreate} className="flex flex-col gap-3">
              {/* Type picker */}
              <div className="flex gap-2 mb-1">
                {CREATABLE_TYPES.map((t) => {
                  const cfg = typeConfig[t]
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedType(t)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                      style={selectedType === t
                        ? { background: `rgba(${t === 'debtor' ? '251,146,60' : '192,132,252'},0.18)`, border: `1px solid ${cfg.color}`, color: cfg.color }
                        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#5a7a94' }
                      }
                    >
                      {cfg.icon} {typeLabel[t]}
                    </button>
                  )
                })}
              </div>
              <textarea
                name="message"
                rows={3}
                placeholder="Describe the alert…"
                required
                autoFocus
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={isPending}
                style={{ background: 'linear-gradient(135deg, #00C896 0%, #00a87e 100%)', boxShadow: '0 0 24px rgba(0,200,150,0.35)', borderRadius: '14px', padding: '14px', color: '#080f1a', fontWeight: 700, fontSize: '15px', width: '100%', marginTop: '4px', opacity: isPending ? 0.6 : 1 }}
              >
                {isPending ? 'Saving…' : 'Create Alert'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
