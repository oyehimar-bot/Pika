import { useState } from 'react'
import {
  X,
  Layers,
  Plus,
  Calendar,
  AlertTriangle,
  SlidersHorizontal,
  Clock,
  TrendingUp,
} from 'lucide-react'
import type { ProductWithStock, Batch } from '@/db'
import { useProductBatches } from '@/hooks/useDatabase'
import { StockAdjustModal } from './StockAdjustModal'
import { formatCurrency } from '@/utils/currency'
import { useAppSettings } from '@/context/AppSettingsContext'

interface BatchListModalProps {
  isOpen: boolean
  onClose: () => void
  product: ProductWithStock | null
  onOpenReceiveBatch: (product: ProductWithStock) => void
}

export function BatchListModal({
  isOpen,
  onClose,
  product,
  onOpenReceiveBatch,
}: BatchListModalProps) {
  const { showExpiry } = useAppSettings()
  const [adjustingBatch, setAdjustingBatch] = useState<Batch | null>(null)
  const batches = useProductBatches(product?.id)

  if (!isOpen || !product) return null

  const now = new Date()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-2xl shadow-pika-950/40 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-pika-100 dark:bg-pika-950/60 text-pika-700 dark:text-pika-300">
                {product.sku}
              </span>
              <span className="text-xs text-surface-500 dark:text-surface-400">
                • {product.category}
              </span>
            </div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-pika-500" />
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Stock Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-surface-100/50 dark:bg-surface-800/40 border-b border-surface-200 dark:border-surface-800 text-xs">
          <div>
            <span className="text-surface-500 dark:text-surface-400 block font-medium">
              Total Active Stock
            </span>
            <span className="text-base font-bold text-surface-900 dark:text-white">
              {product.totalStock} {product.unit}s
            </span>
          </div>
          <div>
            <span className="text-surface-500 dark:text-surface-400 block font-medium">
              Inventory Cost Value
            </span>
            <span className="text-base font-bold text-purple-600 dark:text-purple-400 font-mono">
              {formatCurrency(product.totalValue)}
            </span>
          </div>
          <div>
            <span className="text-surface-500 dark:text-surface-400 block font-medium">
              Avg. Cost / Unit
            </span>
            <span className="text-base font-bold text-surface-900 dark:text-white font-mono">
              {formatCurrency(product.avgCostPrice)}
            </span>
          </div>
          <div>
            <span className="text-surface-500 dark:text-surface-400 block font-medium">
              Active Lots
            </span>
            <span className="text-base font-bold text-surface-900 dark:text-white">
              {batches?.length || 0} batches
            </span>
          </div>
        </div>

        {/* Batch Queue Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-surface-900 dark:text-white flex items-center gap-1.5">
                FIFO Batch Inventory Queue
              </h3>
              <p className="text-xs text-surface-500 dark:text-surface-400">
                Sorted strictly by arrival date — the topmost batch will be sold first
              </p>
            </div>
            <button
              onClick={() => {
                onClose()
                onOpenReceiveBatch(product)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pika-600 hover:bg-pika-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Receive New Batch
            </button>
          </div>

          {batches && batches.length > 0 ? (
            <div className="space-y-3">
              {batches.map((batch, index) => {
                const isFifoNext = index === 0
                const percentRemaining =
                  batch.initialQty > 0
                    ? Math.round((batch.remainingQty / batch.initialQty) * 100)
                    : 0

                let expiryStatus = null
                if (showExpiry && batch.expiryDate) {
                  const daysToExpiry = Math.ceil(
                    (new Date(batch.expiryDate).getTime() - now.getTime()) /
                      (24 * 60 * 60 * 1000)
                  )
                  if (daysToExpiry <= 0) {
                    expiryStatus = {
                      label: 'Expired',
                      color: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400',
                      icon: AlertTriangle,
                    }
                  } else if (daysToExpiry <= 14) {
                    expiryStatus = {
                      label: `Expiring in ${daysToExpiry}d`,
                      color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
                      icon: Clock,
                    }
                  } else {
                    expiryStatus = {
                      label: `Exp: ${new Date(batch.expiryDate).toLocaleDateString()}`,
                      color: 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300',
                      icon: Calendar,
                    }
                  }
                }

                return (
                  <div
                    key={batch.id}
                    className={`relative p-4 rounded-xl border transition-all ${
                      isFifoNext
                        ? 'border-pika-500/50 bg-pika-50/30 dark:bg-pika-950/20 shadow-md shadow-pika-500/5'
                        : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900/60 hover:border-surface-300 dark:hover:border-surface-700'
                    }`}
                  >
                    {/* Top row: Batch Number, FIFO Badge, Expiry badge, and Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {isFifoNext && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pika-600 text-white uppercase tracking-wider shadow-sm">
                            <TrendingUp className="w-3 h-3" />
                            #1 Next in FIFO
                          </span>
                        )}
                        <span className="font-mono font-bold text-sm text-surface-900 dark:text-white">
                          {batch.batchNumber}
                        </span>
                        {batch.supplier && (
                          <span className="text-xs text-surface-500 dark:text-surface-400 hidden sm:inline">
                            from {batch.supplier}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {expiryStatus && (
                          <span
                            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${expiryStatus.color}`}
                          >
                            <expiryStatus.icon className="w-3 h-3" />
                            {expiryStatus.label}
                          </span>
                        )}

                        <button
                          onClick={() => setAdjustingBatch(batch)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          Adjust
                        </button>
                      </div>
                    </div>

                    {/* Middle row: Quantities and Financials */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 text-xs text-surface-600 dark:text-surface-300">
                      <div>
                        <span className="text-surface-400 block text-[11px]">Remaining</span>
                        <span className="font-bold text-surface-900 dark:text-white text-sm">
                          {batch.remainingQty}{' '}
                          <span className="text-xs font-normal text-surface-400">
                            / {batch.initialQty}
                          </span>
                        </span>
                      </div>
                      <div>
                        <span className="text-surface-400 block text-[11px]">Cost Price</span>
                        <span className="font-semibold text-surface-900 dark:text-white font-mono">
                          {formatCurrency(batch.costPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-surface-400 block text-[11px]">Selling Price</span>
                        <span className="font-semibold text-surface-900 dark:text-white font-mono">
                          {formatCurrency(batch.sellingPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-surface-400 block text-[11px]">Received Date</span>
                        <span className="font-medium">
                          {new Date(batch.receivedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Progress Bar */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-surface-400 font-medium mb-1">
                        <span>Stock Remaining</span>
                        <span>{percentRemaining}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentRemaining > 50
                              ? 'bg-emerald-500'
                              : percentRemaining > 20
                              ? 'bg-pika-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${percentRemaining}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-surface-200 dark:border-surface-800">
              <Layers className="w-10 h-10 text-surface-400 mb-2 opacity-50" />
              <p className="text-sm font-semibold text-surface-900 dark:text-white">
                No active batches in stock
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1 max-w-sm">
                Receive an incoming inventory batch to replenish stock and initiate FIFO tracking.
              </p>
              <button
                onClick={() => {
                  onClose()
                  onOpenReceiveBatch(product)
                }}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pika-600 hover:bg-pika-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Receive Batch Now
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50">
          <div className="text-xs text-surface-500 dark:text-surface-400">
            Reorder Threshold: <strong className="text-surface-900 dark:text-white">{product.reorderLevel} units</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Adjust Stock submodal */}
      <StockAdjustModal
        isOpen={Boolean(adjustingBatch)}
        onClose={() => setAdjustingBatch(null)}
        batch={adjustingBatch}
        productName={product.name}
      />
    </div>
  )
}
