import { Package, Plus, Search, Filter } from 'lucide-react'

export function InventoryPage() {
  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Product Catalog
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Manage your products, batches, and stock levels
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pika-600 to-pika-700 text-white font-semibold text-sm hover:from-pika-700 hover:to-pika-800 transition-all shadow-lg shadow-pika-600/25 hover:shadow-pika-600/40">
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search products, SKUs, batches..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 text-sm hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Empty state */}
      <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="p-4 rounded-2xl bg-pika-50 dark:bg-pika-950/30 mb-4">
            <Package className="w-10 h-10 text-pika-500" />
          </div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
            No products yet
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 max-w-sm text-center">
            Get started by adding your first product. You can track batches, expiry
            dates, and costs with FIFO valuation.
          </p>
          <button className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pika-600 to-pika-700 text-white font-semibold text-sm hover:from-pika-700 hover:to-pika-800 transition-all shadow-lg shadow-pika-600/25">
            <Plus className="w-4 h-4" />
            Add Your First Product
          </button>
        </div>
      </div>
    </div>
  )
}

