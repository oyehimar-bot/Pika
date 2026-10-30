import { useState, useMemo } from 'react'
import {
  Shield,
  Search,
  ShoppingCart,
  Layers,
  SlidersHorizontal,
  Package,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
} from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type AuditLog, type AuditAction } from '@/db'

type ActionCategory =
  | 'all'
  | 'sales'
  | 'inventory'
  | 'catalog'
  | 'security'

export function AuditPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory>('all')
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null)

  // Real-time live query for audit logs, ordered newest first
  const logs = useLiveQuery(() =>
    db.auditLogs
      .orderBy('timestamp')
      .reverse()
      .limit(300)
      .toArray()
  )

  // Categorization mapping
  const actionCategories: Record<AuditAction, ActionCategory> = {
    sale_completed: 'sales',
    sale_voided: 'sales',
    discount_applied: 'sales',
    batch_received: 'inventory',
    batch_adjusted: 'inventory',
    batch_expired: 'inventory',
    stock_adjustment: 'inventory',
    product_created: 'catalog',
    product_updated: 'catalog',
    product_deleted: 'catalog',
    staff_login: 'security',
    staff_logout: 'security',
    data_export: 'security',
    settings_changed: 'security',
  }

  // Filtered logs
  const filteredLogs = useMemo(() => {
    if (!logs) return []

    return logs.filter((log) => {
      // Category filter
      if (selectedCategory !== 'all') {
        const cat = actionCategories[log.action] || 'security'
        if (cat !== selectedCategory) return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const match =
          log.details.toLowerCase().includes(q) ||
          log.staffName.toLowerCase().includes(q) ||
          log.action.toLowerCase().includes(q) ||
          log.entity.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [logs, selectedCategory, searchQuery])

  // Summary counts
  const stats = useMemo(() => {
    if (!logs) return { total: 0, sales: 0, stockEdits: 0, security: 0 }
    return {
      total: logs.length,
      sales: logs.filter((l) => actionCategories[l.action] === 'sales').length,
      stockEdits: logs.filter((l) => actionCategories[l.action] === 'inventory').length,
      security: logs.filter((l) => actionCategories[l.action] === 'security').length,
    }
  }, [logs])

  // Action badge formatting
  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'sale_completed':
        return {
          label: 'Sale Completed',
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
          icon: ShoppingCart,
        }
      case 'sale_voided':
        return {
          label: 'Sale Voided',
          color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
          icon: RotateCcw,
        }
      case 'discount_applied':
        return {
          label: 'Price Override / Discount',
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
          icon: SlidersHorizontal,
        }
      case 'batch_received':
        return {
          label: 'Batch Received',
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
          icon: Layers,
        }
      case 'stock_adjustment':
        return {
          label: 'Stock Adjustment',
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
          icon: SlidersHorizontal,
        }
      case 'batch_expired':
        return {
          label: 'Batch Expired',
          color: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
          icon: AlertTriangle,
        }
      case 'product_created':
        return {
          label: 'Product Created',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
          icon: Package,
        }
      case 'product_updated':
        return {
          label: 'Product Updated',
          color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
          icon: FileText,
        }
      case 'product_deleted':
        return {
          label: 'Product Archived',
          color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300',
          icon: AlertTriangle,
        }
      case 'staff_login':
        return {
          label: 'Staff Session',
          color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
          icon: User,
        }
      default:
        return {
          label: action.replace(/_/g, ' '),
          color: 'bg-surface-100 text-surface-800 dark:bg-surface-800 dark:text-surface-300',
          icon: Shield,
        }
    }
  }

  const toggleExpand = (id?: number) => {
    if (!id) return
    setExpandedLogId(expandedLogId === id ? null : id)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-pika-500" />
            Audit Trail & Activity Log
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Immutable, timestamped ledger of all retail operations, stock variances, and staff events
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400 font-medium bg-surface-100 dark:bg-surface-800 px-3.5 py-2 rounded-xl">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span>Local IndexedDB Security Enabled</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <span className="text-xs font-semibold text-surface-500 dark:text-surface-400 block">
            Total Audit Events
          </span>
          <span className="text-2xl font-black text-surface-900 dark:text-white mt-1 block">
            {stats.total}
          </span>
          <span className="text-[11px] text-surface-400">All-time local events</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <span className="text-xs font-semibold text-surface-500 dark:text-surface-400 block">
            Sales & Transactions
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {stats.sales}
          </span>
          <span className="text-[11px] text-surface-400">Completed & voided</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <span className="text-xs font-semibold text-surface-500 dark:text-surface-400 block">
            Inventory Adjustments
          </span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 block">
            {stats.stockEdits}
          </span>
          <span className="text-[11px] text-surface-400">Batches & variance</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <span className="text-xs font-semibold text-surface-500 dark:text-surface-400 block">
            Security & System
          </span>
          <span className="text-2xl font-black text-pika-600 dark:text-pika-400 mt-1 block">
            {stats.security}
          </span>
          <span className="text-[11px] text-surface-400">Staff authentication</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by staff name, action, or details..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Events' },
            { id: 'sales', label: 'Sales & Returns' },
            { id: 'inventory', label: 'Stock & Batches' },
            { id: 'catalog', label: 'Catalog' },
            { id: 'security', label: 'Security & PIN' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as ActionCategory)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-pika-600 text-white shadow-sm'
                  : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table / Stream */}
      {filteredLogs.length > 0 ? (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <div className="divide-y divide-surface-200 dark:divide-surface-800">
            {filteredLogs.map((log: AuditLog) => {
              const badge = getActionBadge(log.action)
              const Icon = badge.icon
              const isExpanded = expandedLogId === log.id
              const dateObj = new Date(log.timestamp)

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-surface-50/70 dark:hover:bg-surface-800/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    {/* Left: Action badge, description, staff */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-semibold text-surface-700 dark:text-surface-300">
                            <User className="w-3 h-3 text-surface-400" />
                            {log.staffName}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-surface-900 dark:text-white leading-snug">
                          {log.details}
                        </p>
                      </div>
                    </div>

                    {/* Right: Timestamp & metadata toggle */}
                    <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0 text-xs text-surface-400">
                      <div className="text-right">
                        <span className="font-mono text-surface-700 dark:text-surface-300 block font-medium">
                          {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-[11px] text-surface-400">
                          {dateObj.toLocaleDateString()}
                        </span>
                      </div>

                      {log.metadata && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-[11px] font-semibold text-surface-600 dark:text-surface-300 transition-colors"
                        >
                          <span>JSON</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable JSON Metadata Inspector */}
                  {isExpanded && log.metadata && (
                    <div className="mt-3 pt-3 border-t border-dashed border-surface-200 dark:border-surface-800 animate-fade-in">
                      <div className="text-[10px] font-mono text-surface-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Raw Event Metadata Snapshot
                      </div>
                      <pre className="p-3 rounded-xl bg-surface-950 text-emerald-400 font-mono text-xs overflow-x-auto shadow-inner border border-surface-800">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-16 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-pika-50 dark:bg-pika-950/40 text-pika-500 mx-auto flex items-center justify-center mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-surface-900 dark:text-white">
            {searchQuery || selectedCategory !== 'all'
              ? 'No matching audit records found'
              : 'Audit log is clean'}
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try resetting your filter parameters or search keyword.'
              : 'As sales occur and batches are managed, immutable audit entries will automatically register here.'}
          </p>
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-xs font-semibold hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
