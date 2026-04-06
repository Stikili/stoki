'use client'

import { useState, useCallback, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'

interface VoiceInputProps {
  onResult: (text: string) => void
  className?: string
}

export default function VoiceInput({ onResult, className = '' }: VoiceInputProps) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null)

  const toggle = useCallback(() => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
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
    <button type="button" onClick={toggle}
      className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${className}`}
      style={listening
        ? { background: 'var(--pill-red-bg)', border: '1px solid #EF4444', animation: 'pulse 1.5s infinite' }
        : { background: 'var(--card-bg)', border: '1px solid var(--card-border)' }
      }
      aria-label={listening ? 'Stop listening' : 'Voice input'}>
      {listening ? <MicOff size={18} color="#EF4444" /> : <Mic size={18} color="var(--muted)" />}
    </button>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createRecognition(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  if (!SR) return null
  const r = new SR(); r.continuous = false; r.interimResults = false; r.lang = 'en-ZA'
  return r
}
