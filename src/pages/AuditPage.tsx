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
import { formatCurrency } from '@/utils/currency'

type ActionCategory =
  | 'all'
  | 'sales'
  | 'inventory'
  | 'catalog'
  | 'security'

// Parse JSON if the input is a serialized JSON string or object
export function parsePayload(input: unknown): Record<string, any> | null {
  if (!input) return null
  if (typeof input === 'object') return input as Record<string, any>
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed)
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed
        }
      } catch {
        return null
      }
    }
  }
  return null
}

const KEY_LABELS: Record<string, string> = {
  oldPrice: 'Old Price',
  newPrice: 'New Price',
  previousPrice: 'Previous Price',
  currentPrice: 'Current Price',
  listedPrice: 'Listed Price',
  actualSoldPrice: 'Actual Sold Price',
  listed: 'Listed Price',
  actual: 'Actual Sold Price',
  previousQty: 'Previous Quantity',
  newQty: 'New Quantity',
  oldQty: 'Previous Quantity',
  priceVariance: 'Price Variance',
  costPrice: 'Unit Cost',
  sellingPrice: 'Selling Price',
  initialQty: 'Initial Quantity',
  remainingQty: 'Remaining Quantity',
  transactionId: 'Transaction ID',
  totalAmount: 'Total Revenue',
  totalCost: 'Total Cost',
  totalProfit: 'Net Profit',
  paymentMethod: 'Payment Method',
  batchNumber: 'Batch Number',
  reorderLevel: 'Reorder Level',
  reorderThreshold: 'Reorder Threshold',
  itemCount: 'Item Count',
  staffId: 'Staff ID',
  staffName: 'Staff Name',
  productId: 'Product ID',
  productName: 'Product Name',
  discount: 'Discount',
  notes: 'Notes',
  reason: 'Reason',
  expiryDate: 'Expiry Date',
  receivedDate: 'Received Date',
  varianceNote: 'Variance Note',
  unit: 'Unit of Measure',
  category: 'Category',
  sku: 'SKU Code',
  barcode: 'Barcode',
  businessMode: 'Business Mode',
  storeName: 'Store Name',
}

export function humanizeKey(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key]
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim()
}

export function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'

  const lowerKey = key.toLowerCase()
  const isCurrency =
    lowerKey.includes('price') ||
    lowerKey.includes('cost') ||
    lowerKey.includes('profit') ||
    lowerKey.includes('amount') ||
    lowerKey.includes('total') ||
    lowerKey.includes('discount') ||
    lowerKey.includes('variance')

  if (isCurrency && typeof value === 'number') {
    return formatCurrency(value)
  }

  if (typeof value === 'number') {
    return value.toLocaleString('en-US')
  }

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(value)) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString()
      }
    }
    return value
  }

  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'object' ? humanizeObjectSummary(v) : String(v))).join(', ')
  }

  if (typeof value === 'object') {
    return humanizeObjectSummary(value as Record<string, any>)
  }

  return String(value)
}

function humanizeObjectSummary(obj: Record<string, any>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== undefined && typeof v !== 'object') {
      parts.push(`${humanizeKey(k)}: ${formatValue(k, v)}`)
    }
  }
  return parts.join(' • ')
}

function RenderAuditSummary({ details }: { details: string }) {
  const parsed = parsePayload(details)
  if (!parsed) {
    return (
      <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
        {details}
      </p>
    )
  }

  // 1. Check for price override / price change
  const oldPrice = parsed.oldPrice ?? parsed.previousPrice ?? parsed.listedPrice ?? parsed.listed
  const newPrice = parsed.newPrice ?? parsed.currentPrice ?? parsed.actualSoldPrice ?? parsed.actual
  if (oldPrice !== undefined && newPrice !== undefined) {
    const diff = Number(newPrice) - Number(oldPrice)
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        {(parsed.productName || parsed.product || parsed.name) && (
          <span className="font-semibold text-slate-900 dark:text-white">
            {parsed.productName || parsed.product || parsed.name}:
          </span>
        )}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
          <span className="text-slate-400">Old Price:</span>
          <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
            {formatCurrency(Number(oldPrice))}
          </span>
          <span className="text-purple-500 font-bold">→</span>
          <span className="text-slate-400">New Price:</span>
          <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(Number(newPrice))}
          </span>
          {diff !== 0 && (
            <span
              className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                diff < 0
                  ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {diff > 0 ? `+${formatCurrency(diff)}` : `-${formatCurrency(Math.abs(diff))}`}
            </span>
          )}
        </div>
        {parsed.reason && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            • Reason: {String(parsed.reason)}
          </span>
        )}
      </div>
    )
  }

  // 2. Check for stock variance / quantity adjustment
  const prevQty = parsed.previousQty ?? parsed.oldQty
  const nextQty = parsed.newQty
  if (prevQty !== undefined && nextQty !== undefined) {
    const diff = Number(nextQty) - Number(prevQty)
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        {parsed.batchNumber && (
          <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
            Batch {parsed.batchNumber}:
          </span>
        )}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
          <span className="text-slate-400">Previous Stock:</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{prevQty} units</span>
          <span className="text-amber-500 font-bold">→</span>
          <span className="text-slate-400">Adjusted:</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">{nextQty} units</span>
          {diff !== 0 && (
            <span
              className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                diff < 0
                  ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {diff > 0 ? `+${diff}` : diff} units
            </span>
          )}
        </div>
        {parsed.reason && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            • Reason: {String(parsed.reason)}
          </span>
        )}
      </div>
    )
  }

  // 3. Fallback: render each key-value pair as a clean badge
  const entries = Object.entries(parsed).filter(
    ([_, v]) => typeof v !== 'object' || v === null
  )

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {entries.slice(0, 5).map(([k, v]) => (
        <span
          key={k}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
        >
          <span className="text-slate-400">{humanizeKey(k)}:</span>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatValue(k, v)}
          </span>
        </span>
      ))}
    </div>
  )
}

function HumanReadableMetadata({ metadata }: { metadata: Record<string, unknown> }) {
  if (!metadata || typeof metadata !== 'object' || Object.keys(metadata).length === 0) {
    return null
  }

  const priceOverrides = Array.isArray(metadata.priceOverrides)
    ? (metadata.priceOverrides as Array<{
        product?: string
        productName?: string
        listed?: number
        listedPrice?: number
        actual?: number
        actualSoldPrice?: number
        variance?: number
        priceVariance?: number
        note?: string
        varianceNote?: string
      }>)
    : null

  const updates =
    metadata.updates && typeof metadata.updates === 'object'
      ? (metadata.updates as Record<string, any>)
      : null
  const previous =
    metadata.previous && typeof metadata.previous === 'object'
      ? (metadata.previous as Record<string, any>)
      : null

  // Filter out priceOverrides, updates, previous from standard entries
  const standardEntries = Object.entries(metadata).filter(
    ([k]) => k !== 'priceOverrides' && k !== 'updates' && k !== 'previous'
  )

  return (
    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50 space-y-3 animate-fade-in">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-purple-400" />
        Activity Details & Snapshot
      </div>

      {/* Standard Key-Value Grid */}
      {standardEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {standardEntries.map(([k, v]) => (
            <div
              key={k}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/40"
            >
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                {humanizeKey(k)}
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                {formatValue(k, v)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Field Updates Comparison (e.g. Product Updates) */}
      {updates && (
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
          <span className="text-xs font-semibold text-purple-400 block">
            Modified Fields:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(updates).map(([k, newVal]) => {
              const oldVal = previous ? previous[k] : undefined
              return (
                <div
                  key={k}
                  className="flex items-center gap-2 text-xs p-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-purple-500/10"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {humanizeKey(k)}:
                  </span>
                  {oldVal !== undefined && (
                    <>
                      <span className="text-slate-400 line-through">
                        {formatValue(k, oldVal)}
                      </span>
                      <span className="text-purple-500 font-bold">→</span>
                    </>
                  )}
                  <span className="font-bold text-purple-600 dark:text-purple-300">
                    {formatValue(k, newVal)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Price Overrides List */}
      {priceOverrides && priceOverrides.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/40 space-y-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Line-Item Price Overrides:
          </span>
          <div className="space-y-1.5">
            {priceOverrides.map((item, idx) => {
              const prodName = item.product || item.productName || 'Item'
              const listed = item.listed ?? item.listedPrice ?? 0
              const actual = item.actual ?? item.actualSoldPrice ?? 0
              const variance = item.variance ?? item.priceVariance ?? (actual - listed)
              const note = item.note || item.varianceNote

              return (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700/50"
                >
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {prodName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Listed:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {formatCurrency(listed)}
                    </span>
                    <span className="text-purple-500 font-bold">→</span>
                    <span className="text-slate-400">Sold:</span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(actual)}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        variance < 0
                          ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {variance > 0 ? `+${formatCurrency(variance)}` : `-${formatCurrency(Math.abs(variance))}`}
                    </span>
                    {note && (
                      <span className="text-slate-400 italic">({note})</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

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
          color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
          icon: ShoppingCart,
        }
      case 'sale_voided':
        return {
          label: 'Sale Voided',
          color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
          icon: RotateCcw,
        }
      case 'discount_applied':
        return {
          label: 'Price Override / Discount',
          color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
          icon: SlidersHorizontal,
        }
      case 'batch_received':
        return {
          label: 'Batch Received',
          color: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
          icon: Layers,
        }
      case 'stock_adjustment':
        return {
          label: 'Stock Adjustment',
          color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
          icon: SlidersHorizontal,
        }
      case 'batch_expired':
        return {
          label: 'Batch Expired',
          color: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
          icon: AlertTriangle,
        }
      case 'product_created':
        return {
          label: 'Product Created',
          color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
          icon: Package,
        }
      case 'product_updated':
        return {
          label: 'Product Updated',
          color: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
          icon: FileText,
        }
      case 'product_deleted':
        return {
          label: 'Product Archived',
          color: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
          icon: AlertTriangle,
        }
      case 'staff_login':
        return {
          label: 'Staff Session',
          color: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
          icon: User,
        }
      default:
        return {
          label: action.replace(/_/g, ' '),
          color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-purple-500" />
            Audit Trail & Activity Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Immutable, timestamped ledger of all retail operations, stock variances, and staff events
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 px-3.5 py-2 rounded-xl">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Local IndexedDB Security Enabled</span>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
          <span className="text-xs font-semibold text-slate-400 block">
            Total Audit Events
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
            {stats.total}
          </span>
          <span className="text-[11px] text-slate-400">All-time local events</span>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
          <span className="text-xs font-semibold text-slate-400 block">
            Sales & Transactions
          </span>
          <span className="text-2xl font-bold text-emerald-400 mt-1 block">
            {stats.sales}
          </span>
          <span className="text-[11px] text-slate-400">Completed & voided</span>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
          <span className="text-xs font-semibold text-slate-400 block">
            Inventory Adjustments
          </span>
          <span className="text-2xl font-bold text-amber-400 mt-1 block">
            {stats.stockEdits}
          </span>
          <span className="text-[11px] text-slate-400">Batches & variance</span>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
          <span className="text-xs font-semibold text-slate-400 block">
            Security & System
          </span>
          <span className="text-2xl font-bold text-purple-400 mt-1 block">
            {stats.security}
          </span>
          <span className="text-[11px] text-slate-400">Staff authentication</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by staff name, action, or details..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ease-in-out"
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ease-in-out active:scale-95 ${
                selectedCategory === cat.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table / Stream */}
      {filteredLogs.length > 0 ? (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
            {filteredLogs.map((log: AuditLog) => {
              const badge = getActionBadge(log.action)
              const Icon = badge.icon
              const isExpanded = expandedLogId === log.id
              const dateObj = new Date(log.timestamp)

              return (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-700/20 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    {/* Left: Action badge, description, staff */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 flex-shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <User className="w-3 h-3 text-slate-400" />
                            {log.staffName}
                          </span>
                        </div>
                        {/* Human-readable details rendering */}
                        <RenderAuditSummary details={log.details} />
                      </div>
                    </div>

                    {/* Right: Timestamp & metadata toggle */}
                    <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0 text-xs text-slate-400">
                      <div className="text-right">
                        <span className="font-mono text-slate-700 dark:text-slate-300 block font-medium">
                          {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {dateObj.toLocaleDateString()}
                        </span>
                      </div>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <button
                          onClick={() => toggleExpand(log.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-[11px] font-semibold text-slate-600 dark:text-slate-300 transition-all duration-200 ease-in-out active:scale-95"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Human-Readable Metadata Details */}
                  {isExpanded && log.metadata && (
                    <HumanReadableMetadata metadata={log.metadata} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-16 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {searchQuery || selectedCategory !== 'all'
              ? 'No matching audit records found'
              : 'Audit log is clean'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
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
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 ease-in-out active:scale-95"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
