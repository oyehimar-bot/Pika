import { Settings, Moon, Sun, Database, Download, Key, Palette } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Settings
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Manage your app preferences and data
        </p>
      </div>

      {/* Settings sections */}
      <div className="space-y-4">
        {/* Appearance */}
        <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-5">
          <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-pika-500" />
            Appearance
          </h3>
          <div className="flex items-center justify-between py-3 border-t border-surface-100 dark:border-surface-800">
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                Theme
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                Switch between light and dark mode
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors text-sm font-medium"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-pika-500" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Data */}
        <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-5">
          <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-pika-500" />
            Data Management
          </h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-3 border-t border-surface-100 dark:border-surface-800">
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  Storage
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Local IndexedDB — all data stays on your device
                </p>
              </div>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                Local-first
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-surface-100 dark:border-surface-800">
              <div>
                <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  Export Data
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Download your data as CSV, JSON, or SQLite
                </p>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-sm hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-5">
          <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-pika-500" />
            Security
          </h3>
          <div className="flex items-center justify-between py-3 border-t border-surface-100 dark:border-surface-800">
            <div>
              <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                Staff PIN System
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                Quick 4-digit PIN for staff switching
              </p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-sm hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors">
              <Settings className="w-4 h-4" />
              Configure
            </button>
          </div>
        </div>

        {/* About */}
        <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <img src="/pika-logo.png" alt="Pika" className="w-10 h-10 rounded-xl" />
            <div>
              <p className="font-semibold text-surface-900 dark:text-white">Pika</p>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                v0.1.0 — Local-first inventory management
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

