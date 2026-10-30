import { useState, useMemo } from 'react'
import {
  Receipt as ReceiptIcon,
  Search,
  Calendar,
  Printer,
  Download,
  DollarSign,
  CreditCard,
  Building,
  Clock,
  User,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useReceipts } from '@/hooks/useDatabase'
import {
  convertReceiptToSaleWithItems,
  exportReceiptsToCSV,
  type ReceiptFilterOptions,
} from '@/db/receiptService'
import type { ReceiptSnapshot, PaymentMethod, SaleWithItems } from '@/db'
import { ReceiptModal } from '@/components/pos/ReceiptModal'
import { formatCurrency, formatNumber } from '@/utils/currency'

type DatePreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'

export function ReceiptsPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all')

  // Expanded row details
  const [expandedReceiptId, setExpandedReceiptId] = useState<number | null>(null)

  // Reprint modal state
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<SaleWithItems | null>(null)
  const [reprintCashTendered, setReprintCashTendered] = useState<number | undefined>(undefined)
  const [reprintCashChange, setReprintCashChange] = useState<number | undefined>(undefined)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  // Calculate start/end dates from preset
  const { startDate, endDate } = useMemo(() => {
    const now = new Date()
    if (datePreset === 'all') {
      return { startDate: null, endDate: null }
    }
    if (datePreset === 'today') {
      const s = new Date(now)
      s.setHours(0, 0, 0, 0)
      const e = new Date(now)
      e.setHours(23, 59, 59, 999)
      return { startDate: s, endDate: e }
    }
    if (datePreset === 'yesterday') {
      const s = new Date(now)
      s.setDate(s.getDate() - 1)
      s.setHours(0, 0, 0, 0)
      const e = new Date(now)
      e.setDate(e.getDate() - 1)
      e.setHours(23, 59, 59, 999)
      return { startDate: s, endDate: e }
    }
    if (datePreset === 'week') {
      const s = new Date(now)
      s.setDate(s.getDate() - 6)
      s.setHours(0, 0, 0, 0)
      const e = new Date(now)
      e.setHours(23, 59, 59, 999)
      return { startDate: s, endDate: e }
    }
    if (datePreset === 'month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const e = new Date(now)
      e.setHours(23, 59, 59, 999)
      return { startDate: s, endDate: e }
    }
    if (datePreset === 'custom') {
      const s = customStartDate ? new Date(customStartDate) : null
      const e = customEndDate ? new Date(customEndDate) : null
      return { startDate: s, endDate: e }
    }
    return { startDate: null, endDate: null }
  }, [datePreset, customStartDate, customEndDate])

  // Filter options for hook
  const filterOptions: ReceiptFilterOptions = useMemo(
    () => ({
      query: searchQuery,
      startDate,
      endDate,
      paymentMethod: paymentFilter,
    }),
    [searchQuery, startDate, endDate, paymentFilter]
  )

  const receipts = useReceipts(filterOptions)

  // Overall metrics for current filtered view
  const metrics = useMemo(() => {
    if (!receipts) return { count: 0, totalAmount: 0, avgAmount: 0, totalItems: 0 }
    const count = receipts.length
    const totalAmount = receipts.reduce((sum, r) => sum + r.totalAmount, 0)
    const totalItems = receipts.reduce((sum, r) => sum + r.itemCount, 0)
    const avgAmount = count > 0 ? Math.round((totalAmount / count) * 100) / 100 : 0
    return { count, totalAmount, avgAmount, totalItems }
  }, [receipts])

  // Action: Open Reprint Modal
  const handleOpenReprint = (receipt: ReceiptSnapshot) => {
    const saleModalData = convertReceiptToSaleWithItems(receipt)
    setSelectedReceiptForPrint(saleModalData)
    setReprintCashTendered(receipt.cashTendered)
    setReprintCashChange(receipt.cashChange)
    setIsReceiptModalOpen(true)
  }

  // Action: Export filtered list to CSV
  const handleExportCSV = () => {
    if (!receipts || receipts.length === 0) return
    const csvContent = exportReceiptsToCSV(receipts)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `pika-receipts-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Payment badge helper
  const renderPaymentBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
            <DollarSign className="w-3 h-3" />
            Cash
          </span>
        )
      case 'transfer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300/40">
            <Building className="w-3 h-3" />
            Transfer
          </span>
        )
      case 'card':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300/40">
            <CreditCard className="w-3 h-3" />
            Card/POS
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300">
            {method}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2.5">
            <ReceiptIcon className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            Receipt History & Digital Archive
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Search, review, inspect line items, and reprint official thermal receipts at any time
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={!receipts || receipts.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-xs font-bold hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-sm disabled:opacity-50"
            title="Download CSV report of current receipt list"
          >
            <Download className="w-4 h-4 text-purple-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Receipts */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
            <span className="text-xs font-medium">Receipts Issued</span>
            <ReceiptIcon className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-surface-900 dark:text-white font-mono">
              {formatNumber(metrics.count)}
            </span>
            <span className="text-xs text-surface-400">transactions</span>
          </div>
        </div>

        {/* Total Sales Value */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
            <span className="text-xs font-medium">Total Processed</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(metrics.totalAmount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
            <span className="text-xs font-medium">Average Basket</span>
            <ShoppingBag className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-surface-900 dark:text-white font-mono">
              {formatCurrency(metrics.avgAmount)}
            </span>
            <span className="text-xs text-surface-400">per sale</span>
          </div>
        </div>

        {/* Items Sold */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
            <span className="text-xs font-medium">Units Dispatched</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-surface-900 dark:text-white font-mono">
              {formatNumber(metrics.totalItems)}
            </span>
            <span className="text-xs text-surface-400">line items</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Receipt #, Customer, Cashier, or Product name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
            />
          </div>

          {/* Payment Method filter tabs */}
          <div className="flex items-center gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl text-xs font-semibold">
            {(
              [
                { id: 'all', label: 'All Methods' },
                { id: 'cash', label: 'Cash' },
                { id: 'transfer', label: 'Transfer' },
                { id: 'card', label: 'Card/POS' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPaymentFilter(opt.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  paymentFilter === opt.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Date presets toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            <span className="text-surface-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date:
            </span>
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'week', label: 'Last 7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'custom', label: 'Custom Range' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                onClick={() => setDatePreset(preset.id)}
                className={`px-3 py-1 rounded-full transition-all ${
                  datePreset === preset.id
                    ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900 font-bold shadow-sm'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs animate-fade-in">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200"
              />
              <span className="text-surface-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-800 dark:text-surface-200"
              />
            </div>
          )}
        </div>
      </div>

      {/* Receipts Table List */}
      {receipts && receipts.length > 0 ? (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50/70 dark:bg-surface-900/70 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Receipt # / Ref</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Cashier / Staff</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4 text-right">Amount (₦)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                {receipts.map((receipt) => {
                  const isExpanded = expandedReceiptId === receipt.id
                  const formattedDate = new Date(receipt.timestamp).toLocaleString('en-NG', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })

                  return (
                    <>
                      <tr
                        key={receipt.id || receipt.transactionId}
                        className="hover:bg-surface-50/60 dark:hover:bg-surface-800/40 transition-colors cursor-pointer group"
                        onClick={() =>
                          setExpandedReceiptId(isExpanded ? null : receipt.id || null)
                        }
                      >
                        {/* Receipt Ref */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedReceiptId(isExpanded ? null : receipt.id || null)
                              }}
                              className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-purple-500" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-400">
                              {receipt.receiptNumber}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 text-xs text-surface-600 dark:text-surface-300">
                          {formattedDate}
                        </td>

                        {/* Staff */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-surface-900 dark:text-white font-medium">
                            <User className="w-3.5 h-3.5 text-surface-400" />
                            <span>{receipt.staffName}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-4 px-4 text-xs text-surface-500 dark:text-surface-400">
                          {receipt.customerName || (
                            <span className="italic opacity-60">Walk-in</span>
                          )}
                        </td>

                        {/* Items count */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300">
                            {receipt.itemCount} item{receipt.itemCount === 1 ? '' : 's'}
                          </span>
                        </td>

                        {/* Payment */}
                        <td className="py-4 px-4">
                          {renderPaymentBadge(receipt.paymentMethod)}
                        </td>

                        {/* Total Amount */}
                        <td className="py-4 px-4 text-right font-mono font-bold text-sm text-surface-900 dark:text-white">
                          {formatCurrency(receipt.totalAmount)}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenReprint(receipt)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white font-bold text-xs transition-colors shadow-sm"
                            title="Open thermal print preview to reprint or save PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Reprint</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Line Items Detail Accordion */}
                      {isExpanded && (
                        <tr className="bg-surface-50/80 dark:bg-surface-800/30">
                          <td colSpan={8} className="p-4 px-8">
                            <div className="rounded-xl border border-surface-200 dark:border-surface-700/80 bg-white dark:bg-surface-900/90 p-4 space-y-3">
                              <div className="flex items-center justify-between text-xs font-bold text-surface-700 dark:text-surface-200 border-b border-surface-100 dark:border-surface-800 pb-2">
                                <span>Receipt Line Item Breakdown ({receipt.items.length} lots)</span>
                                <span>Subtotal: {formatCurrency(receipt.subtotal)} | Discount: {formatCurrency(receipt.discount)} | Tax: {formatCurrency(receipt.tax)}</span>
                              </div>

                              <div className="divide-y divide-surface-100 dark:divide-surface-800 text-xs">
                                {receipt.items.map((item, idx) => (
                                  <div key={idx} className="py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-mono text-xs text-purple-600 dark:text-purple-400 font-semibold">
                                        {item.sku}
                                      </span>
                                      <span className="font-medium text-surface-900 dark:text-white truncate">
                                        {item.productName}
                                      </span>
                                      {item.priceVariance && item.priceVariance !== 0 ? (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                          Override {item.priceVariance > 0 ? '+' : ''}{formatCurrency(item.priceVariance)}
                                        </span>
                                      ) : null}
                                    </div>
                                    <div className="text-right flex items-center gap-6 font-mono">
                                      <span className="text-surface-500">
                                        {item.quantity} x {formatCurrency(item.unitPrice)}
                                      </span>
                                      <span className="font-bold text-surface-900 dark:text-white">
                                        {formatCurrency(item.lineTotal)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {receipt.notes && (
                                <div className="text-xs text-surface-400 pt-2 border-t border-surface-100 dark:border-surface-800">
                                  <span className="font-semibold">Notes:</span> {receipt.notes}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-center text-surface-400">
          <ReceiptIcon className="w-12 h-12 mb-3 opacity-30 text-purple-500" />
          <h3 className="font-bold text-base text-surface-800 dark:text-surface-100">
            No Receipts Found
          </h3>
          <p className="text-xs max-w-sm mt-1">
            {searchQuery || datePreset !== 'all' || paymentFilter !== 'all'
              ? 'No receipt entries match your active filters. Try adjusting your search query or date range.'
              : 'Completed transactions at the Point of Sale will automatically record full receipt snapshots here.'}
          </p>
          {(searchQuery || datePreset !== 'all' || paymentFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setDatePreset('all')
                setPaymentFilter('all')
              }}
              className="mt-4 px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 font-semibold text-xs hover:bg-purple-100"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Reprint Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        sale={selectedReceiptForPrint}
        cashTendered={reprintCashTendered}
        cashChange={reprintCashChange}
        isReprint={true}
      />
    </div>
  )
}
