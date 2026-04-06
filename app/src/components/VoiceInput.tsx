'use client'

import { useState, useCallback, useRef } from 'react'

interface VoiceInputProps {
  onResult: (text: string) => void
  className?: string
}

export default function VoiceInput({ onResult, className = '' }: VoiceInputProps) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null)

  const toggle = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = createRecognition()
    if (!recognition) return

    recognitionRef.current = recognition
    recognition.onresult = (e: { results: { transcript: string }[][] }) => {
      const text = e.results[0]?.[0]?.transcript
      if (text) onResult(text)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognition.start()
    setListening(true)
  }, [listening, onResult])

  if (typeof window === 'undefined') return null
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return null

  return (
    <button
      type="button"
      onClick={toggle}
      className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${className}`}
      style={listening
        ? { background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', animation: 'pulse 1.5s infinite' }
        : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }
      }
      aria-label={listening ? 'Stop listening' : 'Voice input'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={listening ? '#ef4444' : '#5a7a94'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    </button>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createRecognition(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SpeechRecognition) return null
  const r = new SpeechRecognition()
  r.continuous = false
  r.interimResults = false
  r.lang = 'en-ZA'
  return r
}
