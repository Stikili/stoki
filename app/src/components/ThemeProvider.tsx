'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark', setTheme: () => {}, toggle: () => {},
})

const STORAGE_KEY = 'stoki_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const themeRef = useRef<Theme>('dark')

  // SSR renders with the 'dark' default; on the client we hydrate the stored
  // theme. setState-in-effect is the canonical pattern for reading browser-only
  // APIs without a hydration mismatch.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    if (saved === 'light' || saved === 'dark') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(saved)
      themeRef.current = saved
      document.documentElement.setAttribute('data-theme', saved)
    }
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    themeRef.current = t
    localStorage.setItem(STORAGE_KEY, t)
    document.documentElement.setAttribute('data-theme', t)
  }, [])

  const toggle = useCallback(() => {
    const next = themeRef.current === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }, [setTheme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
