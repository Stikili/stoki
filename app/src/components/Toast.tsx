'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem { id: number; message: string; type: ToastType; onUndo?: () => void }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void; toastUndo: (message: string, onUndo: () => void) => void }

const ToastContext = createContext<ToastContextValue>({ toast: () => {}, toastUndo: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current; setToasts(prev => [...prev, { id, message, type }]); setTimeout(() => dismiss(id), 3200)
  }, [dismiss])

  const toastUndo = useCallback((message: string, onUndo: () => void) => {
    const id = ++counter.current; setToasts(prev => [...prev, { id, message, type: 'info', onUndo }]); setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  const bg: Record<ToastType, string> = { success: '#143328', error: '#2D1518', info: '#142136' }
  const border: Record<ToastType, string> = { success: '#1E4D3F', error: '#4D1F23', info: '#1E3A5F' }
  const color: Record<ToastType, string> = { success: '#00C896', error: '#EF4444', info: '#60A5FA' }
  const icon: Record<ToastType, string> = { success: '✓', error: '✕', info: 'ℹ' }

  return (
    <ToastContext.Provider value={{ toast, toastUndo }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-[calc(100%-32px)] max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold animate-toast-in pointer-events-auto"
            style={{ background: bg[t.type], border: `1px solid ${border[t.type]}` }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: color[t.type], color: '#0A0E17', fontWeight: 900 }}>{icon[t.type]}</span>
            <span className="flex-1 text-white">{t.message}</span>
            {t.onUndo && <button onClick={() => { t.onUndo?.(); dismiss(t.id) }} className="text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 min-h-0" style={{ background: '#1A2236', color: 'white' }}>Undo</button>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() { return useContext(ToastContext) }
