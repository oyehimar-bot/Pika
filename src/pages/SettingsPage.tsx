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
  Store,
  Package,
  CalendarClock,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { useAppSettings } from '@/context/AppSettingsContext'
import {
  exportDatabaseToJSON,
  exportTableToCSV,
  importDatabaseFromJSON,
} from '@/services/backupService'
import { clearDatabase, seedSampleInventory } from '@/db'
import type { BusinessMode } from '@/db/models'

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const { allStaff, setIsPinModalOpen } = useAuth()
  const {
    businessMode,
    setBusinessMode,
    storeName,
    setStoreName,
    resetOnboarding,
  } = useAppSettings()

  const [backupStatus, setBackupStatus] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [editingStoreName, setEditingStoreName] = useState(storeName)
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameSavedSuccess, setNameSavedSuccess] = useState(false)
  const [autoBackupFreq, setAutoBackupFreq] = useState(() => {
    return localStorage.getItem('pika-auto-backup-frequency') || 'daily'
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSaveStoreName = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingName(true)
    try {
      await setStoreName(editingStoreName)
      setNameSavedSuccess(true)
      setTimeout(() => setNameSavedSuccess(false), 2500)
    } finally {
      setIsSavingName(false)
    }
  }

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!confirm('WARNING: Restoring will overwrite matching local records. Continue?')) {
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      setIsRestoring(true)
      const count = await importDatabaseFromJSON(file)
      setBackupStatus(`Restored ${count} records successfully!`)
      setTimeout(() => setBackupStatus(null), 5000)
    } catch (err: unknown) {
      alert(`Restore failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsRestoring(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleClearDatabase = async () => {
    if (
      confirm(
        'CAUTION: This will purge all products, inventory batches, and sales history from this device! Are you absolutely sure?'
      )
    ) {
      await clearDatabase()
      setBackupStatus('All local records cleared.')
      setTimeout(() => setBackupStatus(null), 3000)
    }
  }

  const handleSeedDemo = async () => {
    await seedSampleInventory()
    setBackupStatus('Sample inventory data loaded!')
    setTimeout(() => setBackupStatus(null), 3000)
  }

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          System Settings & Enterprise Configuration
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Configure business operational mode, store identity, security, data sovereignty, and backups
        </p>
      </div>

      {/* Backup Status Toast Alert */}
      {backupStatus && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-slide-in">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{backupStatus}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Business Mode & Store Identity Section */}
        <div className="rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2 text-base">
              <Store className="w-5 h-5 text-purple-500" />
              Business Identity & Expiry Operation Mode
            </h3>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Currency: ₦ (NGN)
            </span>
          </div>

          {/* Store Name Configuration */}
          <form onSubmit={handleSaveStoreName} className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
              Store / Business Name
            </label>
            <div className="flex gap-2.5 max-w-md">
              <input
                type="text"
                value={editingStoreName}
                onChange={(e) => setEditingStoreName(e.target.value)}
                placeholder="e.g. Apex Wholesalers Ltd"
                className="flex-1 px-3.5 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={isSavingName}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
              >
                {isSavingName ? 'Saving...' : nameSavedSuccess ? 'Saved ✓' : 'Save Name'}
              </button>
            </div>
            <p className="text-[11px] text-surface-400">
              Appears on thermal receipts, customer printouts, and daily sales summaries.
            </p>
          </form>

          {/* Operational Expiry Mode Selector */}
          <div className="space-y-3 pt-3 border-t border-surface-100 dark:border-surface-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
              Product Expiry Operational Mode
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'no_expiry' as BusinessMode,
                  title: 'WITHOUT Expiry Date',
                  desc: 'Boutiques, Electronics, Auto Spares & Hardware. Hides all expiry fields and alerts.',
                  icon: Package,
                },
                {
                  id: 'expiry_only' as BusinessMode,
                  title: 'WITH Expiry Date',
                  desc: 'Pharmacies, Supermarkets & Groceries. Enforces batch expiry and near-expiry warnings.',
                  icon: CalendarClock,
                },
                {
                  id: 'hybrid' as BusinessMode,
                  title: 'Hybrid Store (Both)',
                  desc: 'Mixed goods, departmental stores. Expiry tracking is optional per batch item.',
                  icon: Layers,
                },
              ].map((mode) => {
                const Icon = mode.icon
                const isActive = businessMode === mode.id
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setBusinessMode(mode.id)}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isActive
                        ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-500 ring-2 ring-purple-500/30 shadow-md'
                        : 'bg-white dark:bg-surface-800/60 border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`p-2 rounded-xl ${
                          isActive
                            ? 'bg-purple-600 text-white'
                            : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {isActive && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-600 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-surface-900 dark:text-white mb-1">
                        {mode.title}
                      </h4>
                      <p className="text-[11px] text-surface-500 dark:text-surface-400 leading-relaxed">
                        {mode.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={resetOnboarding}
                className="inline-flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Re-run Store Onboarding Wizard</span>
              </button>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-6">
          <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2 mb-4 text-base">
            <Palette className="w-5 h-5 text-purple-500" />
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
                  <Moon className="w-4 h-4 text-purple-500" />
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
              <Database className="w-5 h-5 text-purple-500" />
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
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/25 transition-all disabled:opacity-50"
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
                  Sales History CSV
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

            {/* Restore from Backup */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-3">
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                  Restore Database from JSON
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Select a previously exported Pika JSON snapshot to restore data
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  disabled={isRestoring}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-300 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-semibold text-surface-800 dark:text-surface-200 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-purple-500" />
                  <span>{isRestoring ? 'Restoring...' : 'Restore JSON File'}</span>
                </button>
              </div>
            </div>

            {/* Automatic Periodic Snapshots Frequency */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 gap-3">
              <div>
                <p className="text-sm font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  Automated Background Snapshots
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                  Frequency of automated background backup reminders
                </p>
              </div>
              <select
                value={autoBackupFreq}
                onChange={(e) => {
                  setAutoBackupFreq(e.target.value)
                  localStorage.setItem('pika-auto-backup-frequency', e.target.value)
                  setBackupStatus(`Auto-backup set to ${e.target.value}`)
                  setTimeout(() => setBackupStatus(null), 2500)
                }}
                className="px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs font-semibold text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily (Recommended)</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security & Staff PIN Authentication Switcher */}
        <div className="rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2 text-base">
                <Key className="w-5 h-5 text-purple-500" />
                Staff Security & Fast PIN Authentication
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                Role-based access control with fast 4-digit PIN switching for store attendants and managers
              </p>
            </div>
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-600/20 transition-all"
            >
              Switch Active Staff
            </button>
          </div>

          <div className="divide-y divide-surface-100 dark:divide-surface-800 pt-2">
            {allStaff.map((staff) => (
              <div key={staff.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-900 dark:text-white">
                      {staff.name}
                    </p>
                    <p className="text-xs text-surface-400 capitalize">
                      {staff.role} • PIN: ••••
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    staff.role === 'admin'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      : staff.role === 'manager'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300'
                  }`}
                >
                  {staff.role.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Database Management & Demo Tools */}
        <div className="rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Developer Tools & Database Reset
          </h3>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={handleSeedDemo}
              className="px-4 py-2 rounded-xl border border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-xs font-semibold text-surface-800 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              Reload Sample SME Inventory
            </button>
            <button
              onClick={handleClearDatabase}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Purge All Local Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
