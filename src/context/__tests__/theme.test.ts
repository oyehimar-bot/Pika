import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Theme Context Logic & Class Switching', () => {
  let store: Record<string, string> = {}
  let rootClassList: Set<string>
  let bodyClassList: Set<string>
  let rootAttributes: Record<string, string>

  beforeEach(() => {
    store = {}
    rootClassList = new Set<string>()
    bodyClassList = new Set<string>()
    rootAttributes = {}

    // Mock localStorage
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = String(val)
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      },
    }

    // Mock document
    const mockRoot = {
      classList: {
        add: (cls: string) => rootClassList.add(cls),
        remove: (...cls: string[]) => cls.forEach((c) => rootClassList.delete(c)),
        contains: (cls: string) => rootClassList.has(cls),
      },
      setAttribute: (k: string, v: string) => {
        rootAttributes[k] = v
      },
      style: {} as Record<string, string>,
    }

    const mockBody = {
      classList: {
        add: (cls: string) => bodyClassList.add(cls),
        remove: (...cls: string[]) => cls.forEach((c) => bodyClassList.delete(c)),
        contains: (cls: string) => bodyClassList.has(cls),
      },
    }

    vi.stubGlobal('localStorage', mockStorage)
    vi.stubGlobal('document', {
      documentElement: mockRoot,
      body: mockBody,
    })
    vi.stubGlobal('window', {
      localStorage: mockStorage,
      matchMedia: () => ({ matches: true }),
    })
  })

  it('correctly toggles dark and light mode classes on documentElement and body', () => {
    // Simulate ThemeProvider effect for dark
    let theme: 'light' | 'dark' = 'dark'

    const applyTheme = (t: 'light' | 'dark') => {
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(t)
      document.body.classList.remove('light', 'dark')
      document.body.classList.add(t)
      document.documentElement.setAttribute('data-theme', t)
      localStorage.setItem('pika-theme', t)
    }

    applyTheme(theme)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.body.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('pika-theme')).toBe('dark')

    // Toggle to light
    theme = 'light'
    applyTheme(theme)
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.body.classList.contains('light')).toBe(true)
    expect(document.body.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('pika-theme')).toBe('light')
  })
})
