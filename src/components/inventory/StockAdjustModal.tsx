import { useState } from 'react'
import { X, SlidersHorizontal, AlertCircle, Check } from 'lucide-react'
import type { Batch } from '@/db'
import { adjustBatchStock } from '@/db'

interface StockAdjustModalProps {
  isOpen: boolean
  onClose: () => void
  batch: Batch | null
  productName: string
  onSuccess?: () => void
}

const ADJUSTMENT_REASONS = [
  'Stock Counting Correction',
  'Damaged / Spoilage Write-Off',
  'Theft / Unaccounted Shrinkage',
  'Customer Return Restock',
  'Supplier Return / Rejection',
  'Other Operational Adjustment',
]

export function StockAdjustModal({
  isOpen,
  onClose,
  batch,
  productName,
  onSuccess,
}: StockAdjustModalProps) {
  const [newQty, setNewQty] = useState(batch ? String(batch.remainingQty) : '0')
  const [reason, setReason] = useState(ADJUSTMENT_REASONS[0])
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !batch) return null

  const parsedNewQty = parseInt(newQty, 10)
  const qtyDiff = isNaN(parsedNewQty) ? 0 : parsedNewQty - batch.remainingQty

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isNaN(parsedNewQty) || parsedNewQty < 0) {
      setError('Adjusted quantity must be a non-negative number.')
      return
    }

    if (parsedNewQty === batch.remainingQty) {
      setError('New quantity is identical to current quantity.')
      return
    }

    const fullReason = notes.trim()
      ? `${reason}: ${notes.trim()}`
      : reason

    try {
      setIsSubmitting(true)
      const res = await adjustBatchStock(
        batch.id!,
        parsedNewQty,
        fullReason,
        'admin',
        'Admin'
      )

      if (!res.success) {
        throw new Error(res.error || 'Failed to adjust stock')
      }

      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Adjustment failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-2xl shadow-pika-950/40 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50">
          <div>
            <h2 className="text-base font-bold text-surface-900 dark:text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-pika-500" />
              Adjust Batch Stock
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Batch <span className="font-mono font-semibold text-pika-600 dark:text-pika-400">{batch.batchNumber}</span> ({productName})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current vs New Quantity comparison */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-800">
            <div>
              <span className="text-[11px] text-surface-500 dark:text-surface-400 block font-medium">
                Current Lot Stock
              </span>
              <span className="text-xl font-bold text-surface-900 dark:text-white">
                {batch.remainingQty} units
              </span>
            </div>
            <div>
              <span className="text-[11px] text-surface-500 dark:text-surface-400 block font-medium">
                Variance
              </span>
              <span
                className={`text-xl font-bold ${
                  qtyDiff > 0
                    ? 'text-emerald-500'
                    : qtyDiff < 0
                    ? 'text-red-500'
                    : 'text-surface-400'
                }`}
              >
                {qtyDiff > 0 ? `+${qtyDiff}` : qtyDiff} units
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Corrected Remaining Quantity *
            </label>
            <input
              type="number"
              min="0"
              required
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              className="w-full text-base font-semibold px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Reason for Adjustment *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
            >
              {ADJUSTMENT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Additional Details / Reference
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Broken packaging write-off approved by manager"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-200 dark:border-surface-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pika-600 hover:bg-pika-700 text-white text-sm font-semibold shadow-md transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>Confirm Adjustment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
