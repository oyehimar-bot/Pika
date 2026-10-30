import { useState, useRef } from 'react'
import {
  Moon,
  Sun,
  Database,
  Download,
  Upload,
  Key,
  Palette,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trash2,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import {
  exportDatabaseToJSON,
  exportTableToCSV,
  importDatabaseFromJSON,
} from '@/services/backupService'
import { clearDatabase, seedSampleInventory } from '@/db'

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { allStaff, setIsPinModalOpen } = useAuth()

  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [autoBackupFreq, setAutoBackupFreq] = useState(() => {
    return localStorage.getItem('pika-auto-backup-frequency') || 'daily'
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleJSONExport = async () => {
    try {
      setIsExporting(true)
      await exportDatabaseToJSON()
      setBackupStatus('Full database exported successfully!')
      setTimeout(() => setBackupStatus(null), 4000)
    } catch (err: unknown) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCSVExport = async (type: 'products' | 'batches' | 'sales' | 'audit') => {
    try {
      await exportTableToCSV(type)
      setBackupStatus(`${type.toUpperCase()} exported as CSV!`)
      setTimeout(() => setBackupStatus(null), 3000)
    } catch (err: unknown) {
      alert(`CSV export failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (
      !confirm(
        'WARNING: Restoring from a backup will overwrite current local database data. Proceed?'
      )
    ) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      setIsRestoring(true)
      const text = await file.text()
      await importDatabaseFromJSON(text)
      alert('Database restored successfully! Reloading page...')
      window.location.reload()
    } catch (err: unknown) {
      alert(`Restore failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAutoBackupChange = (freq: string) => {
    setAutoBackupFreq(freq)
    localStorage.setItem('pika-auto-backup-frequency', freq)
  }

  const handleResetDatabase = async () => {
    if (
      confirm(
        'CAUTION: This will delete ALL local inventory, batches, and sales history. Do you wish to proceed?'
      )
    ) {
      if (confirm('Type confirmation: Are you completely sure?')) {
        await clearDatabase()
        await seedSampleInventory()
        alert('Database cleared and reset to fresh demo catalog. Reloading...')
        window.location.reload()
      }
    }
  }

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          System Settings & Data Ownership
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Self-sovereign offline data exports, automated backups, staff security, and preferences
        </p>
      </div>

      {backupStatus && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-slide-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{backupStatus}</span>
        </div>
      )}

      <div className="space-y-5">
        {/* Appearance Section */}
        <div className="rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-6">
          <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2 mb-4 text-base">
            <Palette className="w-5 h-5 text-pika-500" />
            Display & Appearance
          </h3>
          <div className="flex items-center justify-between py-3 border-t border-surface-100 dark:border-surface-800">
            <div>
              <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                Interface Theme
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                Switch between high-contrast dark mode and crisp light theme
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors text-sm font-semibold text-surface-800 dark:text-surface-200"
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

        {/* Data Ownership & Backup Management */}
        <div className="rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2 text-base">
              <Database className="w-5 h-5 text-pika-500" />
              Data Ownership & Zero Data-Loss Exports
            </h3>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
              Your business data is 100% owned by you and resides locally in browser IndexedDB.
              Generate full snapshots anytime without cloud dependencies.
            </p>
          </div>

          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {/* Full JSON Snapshot */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-3">
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  Full Database Dump (JSON)
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Complete archive of products, batches, sales transactions, line items, and audit logs
                </p>
              </div>
              <button
                disabled={isExporting}
                onClick={handleJSONExport}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pika-600 hover:bg-pika-700 text-white text-xs font-bold shadow-md shadow-pika-600/25 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Generating Dump...' : 'Export JSON Backup'}</span>
              </button>
            </div>

            {/* Individual CSV Exports */}
            <div className="py-4 space-y-2.5">
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  Export Tabular Data (CSV)
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Download spreadsheet-ready CSV files for accounting, Excel, or Google Sheets
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => handleCSVExport('products')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs font-semibold text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  Products CSV
                </button>
                <button
                  onClick={() => handleCSVExport('batches')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs font-semibold text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-500" />
                  Batches & Lots CSV
                </button>
                <button
                  onClick={() => handleCSVExport('sales')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs font-semibold text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />
                  Sales Ledger CSV
                </button>
                <button
                  onClick={() => handleCSVExport('audit')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs font-semibold text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
                  Audit Logs CSV
                </button>
              </div>
            </div>

            {/* Restore Database */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-3">
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  Restore from JSON Backup
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Upload a previously exported .json archive to restore catalog and sales data
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleRestoreFile}
                  className="hidden"
                />
                <button
                  disabled={isRestoring}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-xs font-bold hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-pika-500" />
                  <span>{isRestoring ? 'Restoring Archive...' : 'Choose JSON File'}</span>
                </button>
              </div>
            </div>

            {/* Automated Backup Schedule */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-3">
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-pika-500" />
                  Automated Local Backup Schedule
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Prompts and triggers routine automated backup snapshots
                </p>
              </div>
              <select
                value={autoBackupFreq}
                onChange={(e) => handleAutoBackupChange(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs font-semibold text-surface-900 dark:text-surface-100 focus:outline-none"
              >
                <option value="daily">Daily Snapshot (Recommended)</option>
                <option value="weekly">Weekly Snapshot</option>
                <option value="off">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Staff Security & Session Management */}
        <div className="rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2 text-base">
              <Key className="w-5 h-5 text-pika-500" />
              Staff Security & Active Profiles
            </h3>
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="text-xs font-bold text-pika-600 dark:text-pika-400 hover:underline"
            >
              Switch Session
            </button>
          </div>

          <div className="divide-y divide-surface-100 dark:divide-surface-800">
            {allStaff.map((staff) => (
              <div key={staff.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center font-bold text-xs text-surface-700 dark:text-surface-300">
                    {staff.name.substring(0, 1)}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-surface-900 dark:text-white block">
                      {staff.name}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-surface-400">
                      Role: {staff.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-surface-500 dark:text-surface-400 bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded-md">
                    PIN: {staff.pin}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone: Factory Reset */}
        <div className="rounded-3xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Factory Reset & Clear Database
              </h4>
              <p className="text-xs text-red-500/80 dark:text-red-400/70 mt-1 max-w-lg">
                Permanently erase all local sales history, custom products, and audit logs.
                Replaces existing data with the default sample catalog.
              </p>
            </div>
            <button
              onClick={handleResetDatabase}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4" />
              Reset Local Storage
            </button>
          </div>
        </div>

        {/* App Version Info */}
        <div className="text-center pt-2 text-xs text-surface-400">
          <p className="font-semibold text-surface-600 dark:text-surface-300">
            Pika — Local-First Inventory & POS System
          </p>
          <p className="text-[11px] mt-0.5">Version 0.1.0 • Offline-Ready MVP</p>
        </div>
      </div>
    </div>
  )
}
