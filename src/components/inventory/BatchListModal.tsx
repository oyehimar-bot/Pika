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
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-2xl shadow-purple-900/20 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {product.sku}
              </span>
              <span className="text-xs text-slate-400">
                • {product.category}
              </span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-500" />
              {product.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/40 transition-all duration-200 ease-in-out active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Stock Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50/50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/50 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">
              Total Active Stock
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {product.totalStock} {product.unit}s
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">
              Inventory Cost Value
            </span>
            <span className="text-base font-semibold text-purple-500 dark:text-purple-400 font-mono">
              {formatCurrency(product.totalValue)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">
              Avg. Cost / Unit
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-white font-mono">
              {formatCurrency(product.avgCostPrice)}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">
              Active Lots
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {batches?.length || 0} batches
            </span>
          </div>
        </div>

        {/* Batch Queue Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                FIFO Batch Inventory Queue
              </h3>
              <p className="text-xs text-slate-400">
                Sorted strictly by arrival date — the topmost batch will be sold first
              </p>
            </div>
            <button
              onClick={() => {
                onClose()
                onOpenReceiveBatch(product)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/20 transition-all duration-200 ease-in-out active:scale-95"
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
                      color: 'bg-red-500/10 text-red-400 border border-red-500/20',
                      icon: AlertTriangle,
                    }
                  } else if (daysToExpiry <= 14) {
                    expiryStatus = {
                      label: `Expiring in ${daysToExpiry}d`,
                      color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                      icon: Clock,
                    }
                  } else {
                    expiryStatus = {
                      label: `Exp: ${new Date(batch.expiryDate).toLocaleDateString()}`,
                      color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-700/50',
                      icon: Calendar,
                    }
                  }
                }

                return (
                  <div
                    key={batch.id}
                    className={`relative p-4 rounded-xl border transition-all duration-200 ease-in-out ${
                      isFifoNext
                        ? 'border-purple-500/50 bg-purple-500/10 shadow-md shadow-purple-500/5'
                        : 'border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/60 hover:border-purple-500/30 hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Top row: Batch Number, FIFO Badge, Expiry badge, and Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {isFifoNext && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white uppercase tracking-wider shadow-sm">
                            <TrendingUp className="w-3 h-3" />
                            #1 Next in FIFO
                          </span>
                        )}
                        <span className="font-mono font-semibold text-sm text-slate-900 dark:text-white">
                          {batch.batchNumber}
                        </span>
                        {batch.supplier && (
                          <span className="text-xs text-slate-400 hidden sm:inline">
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
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 ease-in-out active:scale-95"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          Adjust
                        </button>
                      </div>
                    </div>

                    {/* Middle row: Quantities and Financials */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 text-xs text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Remaining</span>
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                          {batch.remainingQty}{' '}
                          <span className="text-xs font-normal text-slate-400">
                            / {batch.initialQty}
                          </span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Cost Price</span>
                        <span className="font-semibold text-slate-900 dark:text-white font-mono">
                          {formatCurrency(batch.costPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Selling Price</span>
                        <span className="font-semibold text-slate-900 dark:text-white font-mono">
                          {formatCurrency(batch.sellingPrice)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Received Date</span>
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {new Date(batch.receivedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Progress Bar */}
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium mb-1">
                        <span>Stock Remaining</span>
                        <span>{percentRemaining}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentRemaining > 50
                              ? 'bg-emerald-500'
                              : percentRemaining > 20
                              ? 'bg-purple-500'
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
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700/50">
              <Layers className="w-10 h-10 text-slate-400 mb-2 opacity-50" />
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No active batches in stock
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Receive an incoming inventory batch to replenish stock and initiate FIFO tracking.
              </p>
              <button
                onClick={() => {
                  onClose()
                  onOpenReceiveBatch(product)
                }}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-900/20 transition-all duration-200 ease-in-out active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Receive Batch Now
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/60">
          <div className="text-xs text-slate-400">
            Reorder Threshold: <strong className="text-slate-900 dark:text-white">{product.reorderLevel} units</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all duration-200 ease-in-out active:scale-95"
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
