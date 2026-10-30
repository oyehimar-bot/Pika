import { useState, useEffect } from 'react'
import { X, Plus, Calendar, AlertCircle, TrendingUp, Sparkles } from 'lucide-react'
import type { Product } from '@/db'
import { addBatch, generateBatchNumber } from '@/db'

interface BatchModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedProduct?: Product | null
  products: Product[]
  onSuccess?: () => void
}

export function BatchModal({
  isOpen,
  onClose,
  preselectedProduct,
  products,
  onSuccess,
}: BatchModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('')
  const [batchNumber, setBatchNumber] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [initialQty, setInitialQty] = useState('')
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [hasExpiry, setHasExpiry] = useState(true)
  const [expiryDate, setExpiryDate] = useState('')
  const [supplier, setSupplier] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (preselectedProduct?.id) {
      setSelectedProductId(preselectedProduct.id)
    } else if (products.length > 0 && selectedProductId === '') {
      setSelectedProductId(products[0].id!)
    }

    // Default batch number
    setBatchNumber(generateBatchNumber(Math.floor(1 + Math.random() * 900)))
    setCostPrice('')
    setSellingPrice('')
    setInitialQty('20')
    setReceivedDate(new Date().toISOString().slice(0, 10))

    // Default expiry 90 days out
    const ninetyDays = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    setExpiryDate(ninetyDays.toISOString().slice(0, 10))
    setHasExpiry(true)
    setSupplier('')
    setNotes('')
    setError(null)
  }, [preselectedProduct, products, isOpen])

  if (!isOpen) return null

  // Live profit calculation
  const costNum = parseFloat(costPrice) || 0
  const sellNum = parseFloat(sellingPrice) || 0
  const qtyNum = parseInt(initialQty, 10) || 0
  const unitProfit = sellNum - costNum
  const marginPercent = sellNum > 0 ? ((unitProfit / sellNum) * 100).toFixed(1) : '0.0'
  const totalBatchCost = costNum * qtyNum
  const totalBatchRevenue = sellNum * qtyNum
  const totalBatchProfit = totalBatchRevenue - totalBatchCost

  const handleGenerateBatch = () => {
    setBatchNumber(generateBatchNumber(Math.floor(1 + Math.random() * 900)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedProductId) {
      setError('Please select a product for this batch.')
      return
    }

    if (!batchNumber.trim()) {
      setError('Batch number is required.')
      return
    }

    if (costNum < 0 || isNaN(costNum)) {
      setError('Cost price must be a positive number.')
      return
    }

    if (sellNum <= 0 || isNaN(sellNum)) {
      setError('Selling price must be greater than zero.')
      return
    }

    if (qtyNum <= 0 || isNaN(qtyNum)) {
      setError('Quantity received must be at least 1.')
      return
    }

    let parsedExpiry: Date | null = null
    if (hasExpiry) {
      if (!expiryDate) {
        setError('Please select an expiry date or uncheck "Has Expiration Date".')
        return
      }
      parsedExpiry = new Date(expiryDate)
    }

    try {
      setIsSubmitting(true)
      await addBatch({
        productId: Number(selectedProductId),
        batchNumber: batchNumber.trim().toUpperCase(),
        costPrice: Math.round(costNum * 100) / 100,
        sellingPrice: Math.round(sellNum * 100) / 100,
        initialQty: qtyNum,
        remainingQty: qtyNum,
        expiryDate: parsedExpiry,
        receivedDate: new Date(receivedDate),
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to receive batch.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-2xl shadow-pika-950/40 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50">
          <div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-pika-500" />
              Receive New Stock Batch
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Record incoming inventory with distinct lot number, cost price, and expiry tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Selector */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Select Product *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              disabled={Boolean(preselectedProduct)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Batch Number & Received Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-surface-700 dark:text-surface-300">
                  Batch / Lot Number *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateBatch}
                  className="flex items-center gap-1 text-[11px] font-semibold text-pika-600 dark:text-pika-400 hover:underline"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-generate
                </button>
              </div>
              <input
                type="text"
                required
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value.toUpperCase())}
                placeholder="e.g. B-20261030-01"
                className="w-full font-mono uppercase px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Received Date *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Pricing & Units (Cost, Selling, Initial Qty) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Cost Price per Unit (₦) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Selling Price per Unit (₦) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Quantity Received *
              </label>
              <input
                type="number"
                min="1"
                required
                value={initialQty}
                onChange={(e) => setInitialQty(e.target.value)}
                placeholder="20"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              />
            </div>
          </div>

          {/* Profit & Margin Preview Banner */}
          {sellNum > 0 && costNum > 0 && (
            <div className="p-3.5 rounded-xl bg-pika-50/70 dark:bg-pika-950/30 border border-pika-200/50 dark:border-pika-800/40 text-xs">
              <div className="flex items-center justify-between text-pika-900 dark:text-pika-200 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-pika-600 dark:text-pika-400" />
                  FIFO Margin Preview
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {marginPercent}% Margin
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-pika-200/40 dark:border-pika-800/40 text-[11px] text-surface-600 dark:text-surface-300">
                <div>
                  <span className="text-surface-400 block">Unit Profit</span>
                  <span className="font-semibold text-surface-900 dark:text-white">
                    ₦{unitProfit.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-surface-400 block">Total Cost</span>
                  <span className="font-semibold text-surface-900 dark:text-white">
                    ₦{totalBatchCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-surface-400 block">Potential Profit</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    ₦{totalBatchProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Expiry Tracking */}
          <div className="p-3.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasExpiry}
                onChange={(e) => setHasExpiry(e.target.checked)}
                className="w-4 h-4 rounded text-pika-600 focus:ring-pika-500 border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800"
              />
              <span className="text-xs font-semibold text-surface-900 dark:text-surface-200">
                Track Expiration Date for this Batch
              </span>
            </label>

            {hasExpiry && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                  Expiry Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
                  <input
                    type="date"
                    required={hasExpiry}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Supplier & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Supplier / Vendor (Optional)
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Metro Wholesale Dist."
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Pallet #4, inspected"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pika-600 to-pika-700 hover:from-pika-700 hover:to-pika-800 text-white text-sm font-semibold shadow-lg shadow-pika-600/25 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Receive Batch Lot</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
