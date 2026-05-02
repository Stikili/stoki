'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { Customer } from '@/domain/entities/customer'
import { WhatsAppBroadcast } from '@/domain/entities/whatsapp-broadcast'
import { createBroadcastAction } from './actions'
import { useToast } from '@/components/Toast'
import { haptic } from '@/lib/haptic'
import { MessageCircle, Send, AlertTriangle } from 'lucide-react'

export default function BroadcastsClient({
  customers,
  reachableCount,
  totalCustomers,
  recentBroadcasts,
}: {
  customers: Customer[]
  reachableCount: number
  totalCustomers: number
  recentBroadcasts: WhatsAppBroadcast[]
}) {
  const { toast } = useToast()
  const [composeOpen, setComposeOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [languageCode, setLanguageCode] = useState('en')
  const [paramText, setParamText] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const allSelected = customers.length > 0 && selectedIds.size === customers.length
  const bodyParams = useMemo(
    () => paramText.split('\n').map((s) => s.trim()).filter(Boolean),
    [paramText],
  )

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(customers.map((c) => c.id)))
  }

  function handleSend() {
    if (!templateName.trim()) {
      toast('Enter a Meta-approved template name', 'error')
      return
    }
    if (selectedIds.size === 0) {
      toast('Pick at least one customer', 'error')
      return
    }
    startTransition(async () => {
      const result = await createBroadcastAction({
        templateName: templateName.trim(),
        languageCode,
        bodyParams,
        notes: notes.trim() || undefined,
        customerIds: [...selectedIds],
      })
      if (!result.ok) {
        toast(result.error ?? 'Failed to send broadcast', 'error')
        return
      }
      haptic([50, 30, 50])
      const sent = result.sent ?? 0
      const failed = result.failed ?? 0
      toast(`Broadcast sent — ${sent} delivered${failed ? `, ${failed} failed` : ''}`)
      setComposeOpen(false)
      setTemplateName('')
      setParamText('')
      setNotes('')
      setSelectedIds(new Set())
    })
  }

  return (
    <>
      <h1 className="text-xl font-bold text-white mb-2">WhatsApp broadcasts</h1>
      <p className="text-muted text-sm mb-4">
        Send a Meta-approved template message to opted-in customers. Outside the
        24-hour conversation window, Meta requires templates — free-form text
        is rejected.
      </p>

      {/* Reach summary */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-sm font-bold text-brand">{customers.length}</p>
            <p className="text-muted text-[10px] uppercase">Opted in</p>
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--foreground)' }}>{reachableCount}</p>
            <p className="text-muted text-[10px] uppercase">With phone</p>
          </div>
          <div>
            <p className="text-sm font-bold text-muted">{totalCustomers}</p>
            <p className="text-muted text-[10px] uppercase">Total</p>
          </div>
        </div>
        {customers.length === 0 && (
          <div className="mt-3 pt-3 flex items-start gap-2" style={{ borderTop: '1px solid var(--card-border)' }}>
            <AlertTriangle size={14} color="#F59E0B" className="flex-shrink-0 mt-0.5" />
            <p className="text-muted text-xs">
              No opted-in customers yet. In <Link href="/customers" className="text-brand">/customers</Link>,
              edit a customer and tick &ldquo;Receives marketing&rdquo;.
            </p>
          </div>
        )}
      </div>

      {customers.length > 0 && !composeOpen && (
        <button
          onClick={() => setComposeOpen(true)}
          className="btn-primary w-full mb-4"
        >
          <MessageCircle size={16} className="inline mr-2" />
          New broadcast
        </button>
      )}

      {/* Compose */}
      {composeOpen && (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold" style={{ color: 'var(--foreground)' }}>New broadcast</p>
            <button onClick={() => setComposeOpen(false)} className="text-muted text-xs">Cancel</button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-muted text-xs ml-1 mb-1 block uppercase tracking-widest font-semibold">Template name *</label>
              <input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. promo_weekly_special"
                className="input"
              />
              <p className="text-muted text-[10px] mt-1 ml-1">
                Must be a template approved in your Meta Business Manager.
              </p>
            </div>

            <div>
              <label className="text-muted text-xs ml-1 mb-1 block uppercase tracking-widest font-semibold">Language</label>
              <select value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} className="input">
                <option value="en">English (en)</option>
                <option value="en_GB">English UK (en_GB)</option>
                <option value="zu">isiZulu (zu)</option>
                <option value="xh">isiXhosa (xh)</option>
                <option value="af">Afrikaans (af)</option>
              </select>
            </div>

            <div>
              <label className="text-muted text-xs ml-1 mb-1 block uppercase tracking-widest font-semibold">Body parameters</label>
              <textarea
                value={paramText}
                onChange={(e) => setParamText(e.target.value)}
                rows={3}
                placeholder={'Hi {{name}}, this week\'s special is mealie meal at R45'}
                className="input font-mono text-xs"
              />
              <p className="text-muted text-[10px] mt-1 ml-1">
                One per line, in template body order. Use <code>{'{{name}}'}</code> or <code>{'{{phone}}'}</code> to
                personalise per recipient.
              </p>
            </div>

            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional, internal only)"
              className="input"
            />

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  Recipients ({selectedIds.size}/{customers.length})
                </p>
                <button onClick={toggleAll} className="text-brand text-xs font-semibold">
                  {allSelected ? 'Clear' : 'Select all'}
                </button>
              </div>
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                {customers.map((c) => {
                  const checked = selectedIds.has(c.id)
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer"
                      style={{ background: checked ? 'rgba(0,200,150,0.08)' : 'var(--surface)', border: '1px solid var(--card-border)' }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(c.id)}
                        className="w-4 h-4 accent-brand"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate" style={{ color: 'var(--foreground)' }}>{c.name}</p>
                        <p className="text-muted text-[10px]">{c.phone}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={isPending || !templateName.trim() || selectedIds.size === 0}
              className="btn-primary mt-2"
              style={{ opacity: isPending || !templateName.trim() || selectedIds.size === 0 ? 0.5 : 1 }}
            >
              <Send size={14} className="inline mr-2" />
              {isPending ? `Sending to ${selectedIds.size}…` : `Send to ${selectedIds.size}`}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {recentBroadcasts.length > 0 && (
        <>
          <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2 ml-1">Recent broadcasts</p>
          <div className="flex flex-col gap-2">
            {recentBroadcasts.map((b) => (
              <div key={b.id} className="card p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{b.templateName}</p>
                  <span className="text-muted text-[10px]">
                    {new Date(b.createdAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <p className="text-muted text-xs">
                  <span className="text-brand font-semibold">{b.sentCount}</span> sent ·{' '}
                  {b.failedCount > 0 && (
                    <><span className="text-danger font-semibold">{b.failedCount}</span> failed · </>
                  )}
                  {b.recipientCount} recipient{b.recipientCount === 1 ? '' : 's'}
                </p>
                {b.notes && <p className="text-muted text-[10px] mt-1">{b.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
