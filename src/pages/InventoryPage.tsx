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
  const { showExpiry, isNoExpiry } = useAppSettings()

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-purple-500" />
            Inventory & Batch Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time catalog, strict FIFO lot costing, and automated expiration monitoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {(!products || products.length === 0) && (
            <button
              onClick={handleLoadDemo}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all duration-200 ease-in-out active:scale-95 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
              Load Sample Catalog
            </button>
          )}

          {/* Smart PDF Invoice Parser Button */}
          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 transition-all duration-200 ease-in-out active:scale-95 shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Import PDF Invoice</span>
          </button>

          <button
            onClick={() => handleOpenReceiveBatch()}
            disabled={!products || products.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all duration-200 ease-in-out active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Layers className="w-4 h-4 text-purple-500" />
            Receive Batch
          </button>

          <button
            onClick={handleOpenAddProduct}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-900/20 transition-all duration-200 ease-in-out active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:shadow-purple-900/10 hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Catalog Products</span>
            <Package className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
              {valuation?.totalProducts ?? 0}
            </span>
            <span className="text-xs text-slate-400">
              ({formatNumber(valuation?.totalUnits ?? 0)} units total)
            </span>
          </div>
        </div>

        {/* Total FIFO Inventory Value */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:shadow-purple-900/10 hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Inventory Value (Cost)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
              {formatCurrency(valuation?.totalCostValue || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              FIFO Basis
            </span>
          </div>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'low_stock' ? 'all' : 'low_stock')}
          className={`p-6 rounded-2xl border shadow-sm cursor-pointer hover:-translate-y-0.5 transition-all duration-200 ease-in-out active:scale-95 ${
            statusFilter === 'low_stock'
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-400 font-mono">
              {valuation?.lowStockCount ?? 0}
            </span>
            <span className="text-xs text-slate-400">at or below threshold</span>
          </div>
        </div>

        {/* Expiring Soon or Projected Margin */}
        {showExpiry ? (
          <div
            onClick={() => setStatusFilter(statusFilter === 'expiring' ? 'all' : 'expiring')}
            className={`p-6 rounded-2xl border shadow-sm cursor-pointer hover:-translate-y-0.5 transition-all duration-200 ease-in-out active:scale-95 ${
              statusFilter === 'expiring'
                ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 hover:border-red-400'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Expiring Soon (14d)</span>
              <Clock className="w-4 h-4 text-red-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-red-400 font-mono">
                {expiringBatches?.length ?? 0}
              </span>
              <span className="text-xs text-slate-400">batches to rotate</span>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:shadow-purple-900/10 hover:-translate-y-0.5 transition-all duration-200 ease-in-out">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Projected Margin</span>
              <TrendingUp className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-purple-500 font-mono">
                {formatCurrency(valuation?.potentialProfit || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-slate-400">estimated profit</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Control Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isNoExpiry ? 'Search by product name, SKU, or category...' : 'Search by product name, SKU, category, or barcode...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ease-in-out"
            />
          </div>

          {/* Sort & View Options */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
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
                className="text-[11px] font-bold text-purple-500 ml-1 hover:underline transition-colors active:scale-95"
              >
                {sortAsc ? 'ASC' : 'DESC'}
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg text-xs font-medium transition-all duration-200 ease-in-out active:scale-95 ${
                  viewMode === 'table'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Table view"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs font-medium transition-all duration-200 ease-in-out active:scale-95 ${
                  viewMode === 'grid'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
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
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ease-in-out active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700/50'
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
              className={`px-2.5 py-1 rounded-lg font-medium transition-all duration-200 ease-in-out active:scale-95 ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('low_stock')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all duration-200 ease-in-out active:scale-95 ${
                statusFilter === 'low_stock'
                  ? 'bg-amber-500 text-white font-semibold'
                  : 'text-amber-400 hover:underline'
              }`}
            >
              Low Stock
            </button>
            {showExpiry && (
              <button
                onClick={() => setStatusFilter('expiring')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all duration-200 ease-in-out active:scale-95 ${
                  statusFilter === 'expiring'
                    ? 'bg-red-500 text-white font-semibold'
                    : 'text-red-400 hover:underline'
                }`}
              >
                Expiring
              </button>
            )}
            <button
              onClick={() => setStatusFilter('out_of_stock')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all duration-200 ease-in-out active:scale-95 ${
                statusFilter === 'out_of_stock'
                  ? 'bg-red-500 text-white font-semibold'
                  : 'text-red-400 hover:underline'
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
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-4">Product & SKU</th>
                    <th className="py-4 px-4">Category</th>
                    <th className="py-4 px-4 text-center">Active Lots</th>
                    <th className="py-4 px-4">Stock Level</th>
                    <th className="py-4 px-4">Avg. Cost</th>
                    <th className="py-4 px-4">Selling Price</th>
                    <th className="py-4 px-4">FIFO Valuation</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredProducts.map((product) => {
                    const isOutOfStock = product.totalStock <= 0
                    const isLowStock = product.isLowStock

                    return (
                      <tr
                        key={product.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-all duration-200 ease-in-out group cursor-pointer"
                        onClick={() => setInspectingProduct(product)}
                      >
                        {/* Product & SKU */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs flex-shrink-0 border border-purple-500/20">
                              {product.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold tracking-tight text-slate-900 dark:text-white truncate">
                                {product.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                <span className="font-mono font-medium text-purple-400">
                                  {product.sku}
                                </span>
                                {!isNoExpiry && product.barcode && (
                                  <span className="flex items-center gap-0.5 text-slate-400">
                                    <BarcodeIcon className="w-3 h-3" />
                                    {product.barcode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 text-slate-400">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all duration-200 ease-in-out active:scale-95 cursor-pointer"
                          >
                            <Layers className="w-3 h-3" />
                            {product.activeBatchCount} lot{product.activeBatchCount === 1 ? '' : 's'}
                          </span>
                        </td>

                        {/* Stock Level & Status Badge */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white font-mono">
                              {product.totalStock} {product.unit}s
                            </span>
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                                OUT
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                LOW
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Reorder: {product.reorderLevel}
                          </div>
                        </td>

                        {/* Avg Cost */}
                        <td className="py-4 px-4 text-slate-400 font-medium font-mono">
                          {formatCurrency(product.avgCostPrice)}
                        </td>

                        {/* Selling Price */}
                        <td className="py-4 px-4 text-slate-900 dark:text-white font-semibold font-mono">
                          {formatCurrency(product.suggestedSellingPrice || product.avgSellingPrice)}
                        </td>

                        {/* Total FIFO Valuation */}
                        <td className="py-4 px-4 font-mono">
                          <span className="font-bold text-purple-400">
                            {formatCurrency(product.totalValue)}
                          </span>
                          {showExpiry && product.isExpiringSoon && (
                            <div className="flex items-center gap-1 text-[11px] text-red-400 font-semibold mt-0.5 font-sans">
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
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-purple-600 hover:text-white transition-all duration-200 ease-in-out active:scale-95 border border-slate-200 dark:border-slate-700/50"
                              title="Inspect Batches"
                            >
                              Lots
                            </button>
                            <button
                              onClick={() => handleOpenReceiveBatch(product)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-200 ease-in-out active:scale-95"
                              title="Receive Stock Batch"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditProduct(product)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-200 ease-in-out active:scale-95"
                              title="Edit Product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all duration-200 ease-in-out active:scale-95"
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
                  className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm hover:shadow-lg hover:shadow-purple-900/10 hover:-translate-y-0.5 transition-all duration-200 ease-in-out cursor-pointer"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
                        {product.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold tracking-tight text-slate-900 dark:text-white text-base transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                        <span className="font-mono text-xs text-purple-400 font-semibold">
                          {product.sku}
                        </span>
                      </div>
                    </div>

                    {isOutOfStock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                        OUT
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        LOW
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        IN STOCK
                      </span>
                    )}
                  </div>

                  {/* Stock Details */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50 text-xs">
                    <div>
                      <span className="text-slate-400 block text-xs">Total Stock</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                        {product.totalStock}{' '}
                        <span className="text-xs font-normal text-slate-400 font-sans">
                          {product.unit}s
                        </span>
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-xs">FIFO Valuation</span>
                      <span className="text-lg font-bold text-purple-400 font-mono">
                        {formatCurrency(product.totalValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-xs">Active Lots</span>
                      <span className="font-semibold text-slate-300">
                        {product.activeBatchCount} lot{product.activeBatchCount === 1 ? '' : 's'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-xs">Selling Price</span>
                      <span className="font-semibold text-slate-300 font-mono">
                        {formatCurrency(product.suggestedSellingPrice || product.avgSellingPrice)}
                      </span>
                    </div>
                  </div>

                  {/* Near Expiry Alert Banner */}
                  {showExpiry && product.isExpiringSoon && (
                    <div className="mt-3 flex items-center gap-1.5 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Has batch lot expiring soon!</span>
                    </div>
                  )}

                  {/* Card Actions */}
                  <div
                    className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => setInspectingProduct(product)}
                      className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:underline transition-colors active:scale-95"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Inspect Batches
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenReceiveBatch(product)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-600 hover:text-white transition-all duration-200 ease-in-out active:scale-95"
                      >
                        + Batch
                      </button>
                      <button
                        onClick={() => handleOpenEditProduct(product)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200 ease-in-out active:scale-95"
                        title="Edit Product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50 transition-all duration-200 ease-in-out active:scale-95"
                        title="Archive Product"
                      >
                        <Trash2 className="w-4 h-4" />
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
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700/50">
            <Package className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            {searchQuery || selectedCategory !== 'All' || statusFilter !== 'all'
              ? 'No matching products found'
              : 'Your inventory catalog is empty'}
          </h3>
          <p className="text-sm text-slate-400 max-w-sm mt-1">
            {searchQuery || selectedCategory !== 'All' || statusFilter !== 'all'
              ? 'Try adjusting your search criteria, category filter, or stock level tabs.'
              : 'Start by adding your first product, receiving an incoming stock batch, or uploading an invoice.'}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={handleOpenAddProduct}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-900/20 transition-all duration-200 ease-in-out active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Add First Product
            </button>
          </div>
        </div>
      )}

      {/* Product Modal (Add / Edit) */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      {/* Batch Modal (Receive Batch) */}
      <BatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        preselectedProduct={batchModalProduct}
        products={products || []}
      />

      {/* Batch Inspection / Detail Modal */}
      <BatchListModal
        isOpen={Boolean(inspectingProduct)}
        onClose={() => setInspectingProduct(null)}
        product={inspectingProduct}
        onOpenReceiveBatch={(prod) => {
          setInspectingProduct(null)
          handleOpenReceiveBatch(prod)
        }}
      />

      {/* Smart Invoice PDF Importer Modal */}
      <InvoiceImportModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  )
}
