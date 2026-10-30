import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'pika-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
        if (stored === 'light' || stored === 'dark') {
          return stored
        }
      } catch {
        // Fallback if localStorage is inaccessible
      }
    }
    return 'dark' // Default to dark mode per specification
  })

  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    const body = document.body

    // Ensure clean class list on html and body
    root.classList.remove('light', 'dark')
    root.classList.add(theme)

    if (body) {
      body.classList.remove('light', 'dark')
      body.classList.add(theme)
    }

    root.setAttribute('data-theme', theme)
    root.style.colorScheme = theme

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [theme])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setTheme = (t: Theme) => {
    if (t === 'light' || t === 'dark') {
      setThemeState(t)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
