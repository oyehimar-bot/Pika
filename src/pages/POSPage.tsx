import { ShoppingCart, Barcode, Receipt, Wifi, WifiOff } from 'lucide-react'
import { useState } from 'react'

export function POSPage() {
  const [isOffline] = useState(false)

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Point of Sale
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Fast checkout with barcode scanning
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          isOffline
            ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
            : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
        }`}>
          {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
          {isOffline ? 'Offline Mode' : 'Online'}
        </div>
      </div>

      {/* POS Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product search / scanner area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Barcode input */}
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              placeholder="Scan barcode or search product..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              autoFocus
            />
          </div>

          {/* Cart empty state */}
          <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 mb-4">
                <ShoppingCart className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
                Cart is empty
              </h3>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                Scan a barcode or search for products to start a sale
              </p>
            </div>
          </div>
        </div>

        {/* Order summary */}
        <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm p-5 space-y-4 h-fit">
          <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-pika-500" />
            Order Summary
          </h3>
          <div className="border-t border-surface-200 dark:border-surface-800 pt-4">
            <div className="flex justify-between text-sm text-surface-500 dark:text-surface-400">
              <span>Subtotal</span>
              <span>₦0.00</span>
            </div>
            <div className="flex justify-between text-sm text-surface-500 dark:text-surface-400 mt-2">
              <span>Tax</span>
              <span>₦0.00</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-surface-900 dark:text-white mt-3 pt-3 border-t border-surface-200 dark:border-surface-800">
              <span>Total</span>
              <span>₦0.00</span>
            </div>
          </div>
          <button
            disabled
            className="w-full py-3 rounded-xl bg-gradient-to-r from-pika-600 to-pika-700 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:from-pika-700 hover:to-pika-800 transition-all shadow-lg shadow-pika-600/25"
          >
            Complete Sale
          </button>
        </div>
      </div>
    </div>
  )
}

