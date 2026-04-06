'use client'

import { useState, useRef, useEffect, useTransition, useCallback } from 'react'
import { Bot, Send, Trash2 } from 'lucide-react'
import VoiceInput from '@/components/VoiceInput'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = ["What to reorder?", "Today's profit?", "Who owes me?", "Best seller?"]
const INTRO: Message = {
  role: 'assistant',
  content: "Hi, I'm stoki — your AI business advisor. Ask me anything about your stock, sales, or customers.",
}

const HISTORY_KEY = (storeId: string) => `stoki_advisor_${storeId}`
const MAX_STORED = 60   // kept in localStorage
const MAX_CONTEXT = 40  // sent to API per turn

const StokiIcon = ({ size = 22 }: { size?: number }) => <Bot size={size} color="white" strokeWidth={2} />

export default function AdvisorClient({ storeId }: { storeId: string }) {
  const [messages, setMessages] = useState<Message[]>([INTRO])
  const [input, setInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const initialised = useRef(false)

  // Load history from localStorage on first mount
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true
    try {
      const raw = localStorage.getItem(HISTORY_KEY(storeId))
      if (raw) {
        const stored: Message[] = JSON.parse(raw)
        if (stored.length > 0) setMessages([INTRO, ...stored])
      }
    } catch { /* ignore */ }
  }, [storeId])

  // Persist history whenever messages change (skip the intro)
  useEffect(() => {
    if (!initialised.current) return
    const toStore = messages.filter((m) => m !== INTRO).slice(-MAX_STORED)
    try {
      localStorage.setItem(HISTORY_KEY(storeId), JSON.stringify(toStore))
    } catch { /* ignore */ }
  }, [messages, storeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function clearHistory() {
    if (!confirm('Clear conversation history?')) return
    localStorage.removeItem(HISTORY_KEY(storeId))
    setMessages([INTRO])
  }

  function send(text: string) {
    if (!text.trim() || isPending) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    // Full stored history + new message, capped at MAX_CONTEXT for the API call
    const history = messages.filter((m) => m !== INTRO)
    const apiMessages = [...history, userMsg].slice(-MAX_CONTEXT)
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    startTransition(async () => {
      try {
        const res = await fetch('/api/advisor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, storeId }),
        })
        const data = await res.json()
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.error ? `Error: ${data.error}` : data.message,
        }])
      } catch {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
      }
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] px-4 pt-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#00C896' }}>
          <StokiIcon size={24} />
        </div>
        <div className="flex-1">
          <h1 className="text-white font-bold">stoki</h1>
          <p className="text-muted text-xs">Your AI business advisor</p>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl min-h-0"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--muted)' }}
          >
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none flex-shrink-0">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => send(prompt)}
            disabled={isPending}
            className="flex-shrink-0 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap active:scale-[0.96]"
            style={{ background: '#1A1530', border: '1px solid #2D2353', color: '#c084fc', opacity: isPending ? 0.5 : 1 }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 mb-3 scrollbar-none">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 items-end ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mb-0.5" style={{ background: '#00C896' }}>
                <StokiIcon size={16} />
              </div>
            )}
            <div
              className="rounded-2xl px-4 py-3 max-w-[82%] text-sm leading-relaxed"
              style={m.role === 'user'
                ? { background: '#143328', border: '1px solid #1E4D3F', color: 'white', borderBottomRightRadius: '4px' }
                : { background: '#141B2D', border: '1px solid #1E293B', color: 'white', borderBottomLeftRadius: '4px' }
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {isPending && (
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: '#00C896' }}>
              <StokiIcon size={16} />
            </div>
            <div className="rounded-2xl px-4 py-3.5" style={{ background: '#141B2D', border: '1px solid #1E293B', borderBottomLeftRadius: '4px' }}>
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="w-1.5 h-1.5 rounded-full bg-muted" style={{ animation: `bounce-dot 1.2s ease-in-out ${delay}ms infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-center pb-4 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Ask anything about your business…"
          disabled={isPending}
          className="input flex-1"
          style={{ opacity: isPending ? 0.6 : 1 }}
        />
        <VoiceInput onResult={(text) => send(text)} />
        <button
          onClick={() => send(input)}
          disabled={isPending || !input.trim()}
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: input.trim() && !isPending ? '#00C896' : 'var(--surface)', transition: 'all 0.2s' }}
        >
          <Send size={18} color={input.trim() && !isPending ? 'white' : '#5A6B80'} />
        </button>
      </div>
    </div>
  )
}
