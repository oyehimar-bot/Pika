import { useState, useMemo } from 'react'
import {
  Package,
  Plus,
  Search,
  Layers,
  AlertTriangle,
  Clock,
  TrendingUp,
  LayoutGrid,
  Table as TableIcon,
  Sparkles,
  ArrowUpDown,
  Edit2,
  Trash2,
  Barcode as BarcodeIcon,
  FileText,
  DollarSign,
} from 'lucide-react'
import type { ProductWithStock } from '@/db'
import {
  useProducts,
  useInventoryValuation,
  useExpiringBatches,
} from '@/hooks/useDatabase'
import { seedSampleInventory, deleteProduct } from '@/db'
import { ProductModal } from '@/components/inventory/ProductModal'
import { BatchModal } from '@/components/inventory/BatchModal'
import { BatchListModal } from '@/components/inventory/BatchListModal'
import { InvoiceImportModal } from '@/components/inventory/InvoiceImportModal'
import { useAppSettings } from '@/context/AppSettingsContext'
import { formatCurrency, formatNumber } from '@/utils/currency'

type SortField = 'name' | 'stock' | 'value' | 'date'
type StockStatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'expiring'

export function InventoryPage() {
  const products = useProducts()
  const valuation = useInventoryValuation()
  const expiringBatches = useExpiringBatches(14)
  const { showExpiry } = useAppSettings()

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<ProductWithStock | null>(null)

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [batchModalProduct, setBatchModalProduct] = useState<ProductWithStock | null>(null)

  const [inspectingProduct, setInspectingProduct] = useState<ProductWithStock | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)

  // Unique categories list
  const categories = useMemo(() => {
    if (!products) return ['All']
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['All', ...Array.from(set).sort()]
  }, [products])

  // Filtered & sorted products list
  const filteredProducts = useMemo(() => {
    if (!products) return []

    return products
      .filter((p) => {
        // Search text matching
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const matchName = p.name.toLowerCase().includes(q)
          const matchSku = p.sku.toLowerCase().includes(q)
          const matchCategory = p.category.toLowerCase().includes(q)
          const matchBarcode = p.barcode ? p.barcode.toLowerCase().includes(q) : false

          if (!matchName && !matchSku && !matchCategory && !matchBarcode) {
            return false
          }
        }

        // Category filter
        if (selectedCategory !== 'All' && p.category !== selectedCategory) {
          return false
        }

        // Stock status filter
        if (statusFilter === 'in_stock' && p.totalStock <= 0) return false
        if (statusFilter === 'low_stock' && !p.isLowStock) return false
        if (statusFilter === 'out_of_stock' && p.totalStock > 0) return false
        if (statusFilter === 'expiring') {
          if (!showExpiry || !p.isExpiringSoon) return false
        }

        return true
      })
      .sort((a, b) => {
        let diff = 0
        switch (sortField) {
          case 'name':
            diff = a.name.localeCompare(b.name)
            break
          case 'stock':
            diff = a.totalStock - b.totalStock
            break
          case 'value':
            diff = a.totalValue - b.totalValue
            break
          case 'date':
            diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            break
        }
        return sortAsc ? diff : -diff
      })
  }, [products, searchQuery, selectedCategory, statusFilter, sortField, sortAsc, showExpiry])

  const handleOpenAddProduct = () => {
    setProductToEdit(null)
    setIsProductModalOpen(true)
  }

  const handleOpenEditProduct = (prod: ProductWithStock) => {
    setProductToEdit(prod)
    setIsProductModalOpen(true)
  }

  const handleOpenReceiveBatch = (prod?: ProductWithStock | null) => {
    setBatchModalProduct(prod || null)
    setIsBatchModalOpen(true)
  }

  const handleDeleteProduct = async (id?: number) => {
    if (!id) return
    if (confirm('Are you sure you want to archive this product?')) {
      await deleteProduct(id)
    }
  }

  const handleLoadDemo = async () => {
    await seedSampleInventory()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-purple-500" />
            Inventory & Batch Management
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Real-time catalog, strict FIFO lot costing, and automated expiration monitoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {(!products || products.length === 0) && (
            <button
              onClick={handleLoadDemo}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-xs font-semibold hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              Load Sample Catalog
            </button>
          )}

          {/* Smart PDF Invoice Parser Button */}
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-500/20 transition-all shadow-sm"
          >
            <FileText className="w-4 h-4 text-purple-500" />
            <span>Import PDF Invoice</span>
          </button>

          <button
            onClick={() => handleOpenReceiveBatch()}
            disabled={!products || products.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-purple-50/80 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Receive Batch
          </button>

          <button
            onClick={handleOpenAddProduct}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-xs hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/25"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
            <span className="text-xs font-medium">Catalog Products</span>
            <Package className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-surface-900 dark:text-white font-mono">
              {valuation?.totalProducts ?? 0}
            </span>
            <span className="text-xs text-surface-400">
              ({formatNumber(valuation?.totalUnits ?? 0)} units total)
            </span>
          </div>
        </div>

        {/* Total FIFO Inventory Value */}
        <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
            <span className="text-xs font-medium">Inventory Value (Cost)</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-surface-900 dark:text-white font-mono">
              {formatCurrency(valuation?.totalCostValue || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              FIFO Basis
            </span>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'low_stock' ? 'all' : 'low_stock')}
          className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${
            statusFilter === 'low_stock'
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
              : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
            <span className="text-xs font-medium">Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {valuation?.lowStockCount ?? 0}
            </span>
            <span className="text-xs text-surface-400">at or below threshold</span>
          </div>
        </div>

        {/* Expiring Soon or Projected Margin */}
        {showExpiry ? (
          <div
            onClick={() => setStatusFilter(statusFilter === 'expiring' ? 'all' : 'expiring')}
            className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition-all ${
              statusFilter === 'expiring'
                ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
                : 'bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 hover:border-rose-400'
            }`}
          >
            <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
              <span className="text-xs font-medium">Expiring Soon (14d)</span>
              <Clock className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono">
                {expiringBatches?.length ?? 0}
              </span>
              <span className="text-xs text-surface-400">batches to rotate</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
            <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
              <span className="text-xs font-medium">Projected Margin</span>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                {formatCurrency(valuation?.potentialProfit || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-surface-400">estimated profit</span>
            </div>
          </div>
        )}
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
              placeholder="Search by product name, SKU, category, or barcode..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
            />
          </div>

          {/* Sort & View Options */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs font-medium text-surface-700 dark:text-surface-200">
              <ArrowUpDown className="w-3.5 h-3.5 text-surface-400" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="bg-transparent border-none outline-none cursor-pointer pr-1"
              >
                <option value="name">Sort by Name</option>
                <option value="stock">Sort by Stock</option>
                <option value="value">Sort by Value</option>
                <option value="date">Sort by Date</option>
              </select>
              <button
                onClick={() => setSortAsc(!sortAsc)}
                className="text-[11px] font-bold text-purple-600 dark:text-purple-400 ml-1 hover:underline"
              >
                {sortAsc ? 'ASC' : 'DESC'}
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
                }`}
                title="Table view"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills & Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status Filter Badges */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-surface-900 text-white dark:bg-surface-100 dark:text-surface-900 font-semibold'
                  : 'text-surface-500 hover:text-surface-900 dark:hover:text-surface-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('low_stock')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'low_stock'
                  ? 'bg-amber-500 text-white font-semibold'
                  : 'text-amber-600 dark:text-amber-400 hover:underline'
              }`}
            >
              Low Stock
            </button>
            {showExpiry && (
              <button
                onClick={() => setStatusFilter('expiring')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === 'expiring'
                    ? 'bg-rose-500 text-white font-semibold'
                    : 'text-rose-600 dark:text-rose-400 hover:underline'
                }`}
              >
                Expiring
              </button>
            )}
            <button
              onClick={() => setStatusFilter('out_of_stock')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'out_of_stock'
                  ? 'bg-red-500 text-white font-semibold'
                  : 'text-red-600 dark:text-red-400 hover:underline'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid View */}
      {filteredProducts.length > 0 ? (
        viewMode === 'table' ? (
          /* Table View */
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50/70 dark:bg-surface-900/70 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Product & SKU</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-center">Active Lots</th>
                    <th className="py-3.5 px-4">Stock Level</th>
                    <th className="py-3.5 px-4">Avg. Cost</th>
                    <th className="py-3.5 px-4">Selling Price</th>
                    <th className="py-3.5 px-4">FIFO Valuation</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                  {filteredProducts.map((product) => {
                    const isOutOfStock = product.totalStock <= 0
                    const isLowStock = product.isLowStock

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-surface-50/60 dark:hover:bg-surface-800/40 transition-colors group cursor-pointer"
                        onClick={() => setInspectingProduct(product)}
                      >
                        {/* Product & SKU */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {product.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-surface-900 dark:text-white truncate">
                                {product.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-surface-400">
                                <span className="font-mono font-medium text-purple-600 dark:text-purple-400">
                                  {product.sku}
                                </span>
                                {product.barcode && (
                                  <span className="flex items-center gap-0.5">
                                    <BarcodeIcon className="w-3 h-3" />
                                    {product.barcode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 text-surface-600 dark:text-surface-300">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-100 dark:bg-surface-800">
                            {product.category}
                          </span>
                        </td>

                        {/* Active Batches Count */}
                        <td className="py-4 px-4 text-center">
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              setInspectingProduct(product)
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
                          >
                            <Layers className="w-3 h-3" />
                            {product.activeBatchCount} lot{product.activeBatchCount === 1 ? '' : 's'}
                          </span>
                        </td>

                        {/* Stock Level & Status Badge */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-surface-900 dark:text-white font-mono">
                              {product.totalStock} {product.unit}s
                            </span>
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                                OUT
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                                LOW
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-surface-400 mt-0.5">
                            Reorder: {product.reorderLevel}
                          </div>
                        </td>

                        {/* Avg Cost */}
                        <td className="py-4 px-4 text-surface-700 dark:text-surface-300 font-medium font-mono">
                          {formatCurrency(product.avgCostPrice)}
                        </td>

                        {/* Selling Price */}
                        <td className="py-4 px-4 text-surface-900 dark:text-white font-semibold font-mono">
                          {formatCurrency(product.suggestedSellingPrice || product.avgSellingPrice)}
                        </td>

                        {/* Total FIFO Valuation */}
                        <td className="py-4 px-4 font-mono">
                          <span className="font-bold text-purple-600 dark:text-purple-400">
                            {formatCurrency(product.totalValue)}
                          </span>
                          {showExpiry && product.isExpiringSoon && (
                            <div className="flex items-center gap-1 text-[11px] text-rose-500 font-semibold mt-0.5 font-sans">
                              <Clock className="w-3 h-3" />
                              Near Expiry
                            </div>
                          )}
                        </td>

                        {/* Row Actions */}
                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectingProduct(product)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 hover:bg-purple-600 hover:text-white transition-colors"
                              title="Inspect Batches"
                            >
                              Lots
                            </button>
                            <button
                              onClick={() => handleOpenReceiveBatch(product)}
                              className="p-1.5 rounded-lg text-surface-500 hover:text-purple-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                              title="Receive Stock Batch"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditProduct(product)}
                              className="p-1.5 rounded-lg text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                              title="Edit Product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                              title="Archive Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.totalStock <= 0
              const isLowStock = product.isLowStock

              return (
                <div
                  key={product.id}
                  onClick={() => setInspectingProduct(product)}
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        {product.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-surface-900 dark:text-white text-base group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                        <span className="font-mono text-xs text-purple-600 dark:text-purple-400 font-semibold">
                          {product.sku}
                        </span>
                      </div>
                    </div>

                    {isOutOfStock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                        OUT
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                        LOW
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        IN STOCK
                      </span>
                    )}
                  </div>

                  {/* Stock Details */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-surface-100 dark:border-surface-800 text-xs">
                    <div>
                      <span className="text-surface-400 block text-[11px]">Total Stock</span>
                      <span className="text-lg font-bold text-surface-900 dark:text-white font-mono">
                        {product.totalStock}{' '}
                        <span className="text-xs font-normal text-surface-400 font-sans">
                          {product.unit}s
                        </span>
                      </span>
                    </div>

                    <div>
                      <span className="text-surface-400 block text-[11px]">FIFO Valuation</span>
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono">
                        {formatCurrency(product.totalValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-surface-400 block text-[11px]">Active Lots</span>
                      <span className="font-semibold text-surface-700 dark:text-surface-300">
                        {product.activeBatchCount} lot{product.activeBatchCount === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div>
                      <span className="text-surface-400 block text-[11px]">Selling Price</span>
                      <span className="font-semibold text-surface-700 dark:text-surface-300 font-mono">
                        {formatCurrency(product.suggestedSellingPrice || product.avgSellingPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Near Expiry Alert Banner */}
                  {showExpiry && product.isExpiringSoon && (
                    <div className="mt-3 flex items-center gap-1.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Has batch lot expiring soon!</span>
                    </div>
                  )}

                  {/* Card Actions */}
                  <div
                    className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-surface-100 dark:border-surface-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setInspectingProduct(product)}
                      className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Inspect Batches
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenReceiveBatch(product)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-600 hover:text-white transition-colors"
                      >
                        + Batch
                      </button>
                      <button
                        onClick={() => handleOpenEditProduct(product)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* Empty State */
        <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-surface-900 dark:text-white">
            {searchQuery || selectedCategory !== 'All' || statusFilter !== 'all'
              ? 'No matching products found'
              : 'Your product catalog is empty'}
          </h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1.5 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== 'All' || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or resetting filters to view all inventory.'
              : 'Add your first product, import a supplier PDF invoice, or load demo inventory to get started.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            {searchQuery || selectedCategory !== 'All' || statusFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('All')
                  setStatusFilter('all')
                }}
                className="px-4 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-xs font-semibold hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
              >
                Clear All Filters
              </button>
            ) : (
              <>
                <button
                  onClick={handleLoadDemo}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 text-xs font-semibold hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Load Demo Products
                </button>
                <button
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Import PDF Invoice
                </button>
                <button
                  onClick={handleOpenAddProduct}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Product
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      {/* Batch Modal */}
      <BatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        preselectedProduct={batchModalProduct}
        products={products || []}
      />

      {/* Batch List Modal */}
      <BatchListModal
        isOpen={Boolean(inspectingProduct)}
        onClose={() => setInspectingProduct(null)}
        product={inspectingProduct}
        onOpenReceiveBatch={(prod) => handleOpenReceiveBatch(prod)}
      />

      {/* Smart PDF Invoice Parser & Staging Modal */}
      <InvoiceImportModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={() => {
          // Triggers re-render through Dexie hooks
        }}
      />
    </div>
  )
}
