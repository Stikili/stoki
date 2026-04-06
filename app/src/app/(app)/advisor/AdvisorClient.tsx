'use client'

import { useState, useRef, useEffect, useTransition } from 'react'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = ["What to reorder?", "Today's profit?", "Who owes me?", "Best seller?"]
const INTRO: Message = {
  role: 'assistant',
  content: "Hi, I'm stoki — your AI business advisor. Ask me anything about your stock, sales, or customers.",
}

const HISTORY_KEY = (storeId: string) => `stoki_advisor_${storeId}`
const MAX_STORED = 60   // kept in localStorage
const MAX_CONTEXT = 40  // sent to API per turn

const StokiIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <polyline points="5,27 12,19 18,23 24,12 35,16" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="35" cy="16" r="2.5" fill="white"/>
  </svg>
)

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
        <div style={{ filter: 'drop-shadow(0 0 12px rgba(0,200,150,0.5))' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#00C896' }}>
            <StokiIcon size={24} />
          </div>
        </div>
        <div className="flex-1">
          <h1 className="text-white font-bold">stoki</h1>
          <p className="text-muted text-xs">Your AI business advisor</p>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearHistory}
            className="text-xs text-muted px-3 py-1.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Clear
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
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', color: '#c084fc', opacity: isPending ? 0.5 : 1 }}
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
                ? { background: 'linear-gradient(135deg, rgba(0,200,150,0.2), rgba(0,200,150,0.1))', border: '1px solid rgba(0,200,150,0.2)', color: 'white', borderBottomRightRadius: '4px' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'white', borderBottomLeftRadius: '4px', boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset' }
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
            <div className="rounded-2xl px-4 py-3.5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderBottomLeftRadius: '4px' }}>
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
          className="flex-1"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px 18px', color: 'white', fontSize: '15px', outline: 'none', opacity: isPending ? 0.6 : 1 }}
        />
        <button
          onClick={() => send(input)}
          disabled={isPending || !input.trim()}
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: input.trim() && !isPending ? 'linear-gradient(135deg, #00C896, #00a87e)' : 'rgba(255,255,255,0.06)', boxShadow: input.trim() && !isPending ? '0 0 20px rgba(0,200,150,0.35)' : 'none', transition: 'all 0.2s' }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path d="M22 2L11 13" stroke={input.trim() && !isPending ? '#080f1a' : '#5a7a94'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim() && !isPending ? '#080f1a' : '#5a7a94'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
