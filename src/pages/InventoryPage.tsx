import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Search,
  Filter,
  Calendar,
  Download,
  MoreHorizontal,
  Plus,
  Edit2,
  Trash2,
  Layers,
  FileText,
  Sparkles,
  SlidersHorizontal,
  Check,
} from 'lucide-react'
import type { ProductWithStock } from '@/db'
import {
  useProducts,
  useInventoryValuation,
} from '@/hooks/useDatabase'
import { seedSampleInventory, deleteProduct } from '@/db'
import { ProductModal } from '@/components/inventory/ProductModal'
import { BatchModal } from '@/components/inventory/BatchModal'
import { BatchListModal } from '@/components/inventory/BatchListModal'
import { InvoiceImportModal } from '@/components/inventory/InvoiceImportModal'
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal'
import { useAppSettings } from '@/context/AppSettingsContext'
import { formatCurrency, formatNumber } from '@/utils/currency'

// ─── Product Thumbnail Component ───────────────────────────────────────────────
function ProductThumbnail({
  name,
  imageUrl,
  category,
}: {
  name: string
  imageUrl?: string
  category: string
}) {
  const [imgError, setImgError] = useState(false)

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={name}
        onError={() => setImgError(true)}
        className="w-9 h-9 rounded-md object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
      />
    )
  }

  // Fallback realistic category thumbnail swatches matching reference aesthetic
  const categoryThemes: Record<string, { bg: string; text: string; symbol: string }> = {
    Beverages: { bg: 'bg-amber-100 border-amber-200', text: 'text-amber-800', symbol: '☕' },
    'Dairy & Eggs': { bg: 'bg-blue-100 border-blue-200', text: 'text-blue-800', symbol: '🥛' },
    Bakery: { bg: 'bg-orange-100 border-orange-200', text: 'text-orange-800', symbol: '🍞' },
    'Pantry & Staples': { bg: 'bg-emerald-100 border-emerald-200', text: 'text-emerald-800', symbol: '🌾' },
    'Snacks & Confectionery': { bg: 'bg-pink-100 border-pink-200', text: 'text-pink-800', symbol: '🍪' },
    'Meat & Poultry': { bg: 'bg-red-100 border-red-200', text: 'text-red-800', symbol: '🥩' },
    'Fresh Produce': { bg: 'bg-lime-100 border-lime-200', text: 'text-lime-800', symbol: '🥬' },
    'Household & Cleaning': { bg: 'bg-teal-100 border-teal-200', text: 'text-teal-800', symbol: '🧼' },
    'Personal Care': { bg: 'bg-indigo-100 border-indigo-200', text: 'text-indigo-800', symbol: '🧴' },
    'General Merchandise': { bg: 'bg-purple-100 border-purple-200', text: 'text-purple-800', symbol: '📦' },
    Texture: { bg: 'bg-fuchsia-100 border-fuchsia-200', text: 'text-fuchsia-800', symbol: '🧵' },
    Fabric: { bg: 'bg-rose-100 border-rose-200', text: 'text-rose-800', symbol: '🧶' },
  }

  const theme = categoryThemes[category] || {
    bg: 'bg-purple-50 border-purple-200',
    text: 'text-purple-700',
    symbol: name.charAt(0).toUpperCase(),
  }

  return (
    <div
      className={`w-9 h-9 rounded-md border ${theme.bg} flex items-center justify-center text-sm font-semibold ${theme.text} flex-shrink-0 shadow-xs`}
    >
      {theme.symbol}
    </div>
  )
}

export function InventoryPage() {
  const products = useProducts()
  const valuation = useInventoryValuation()
  const { showExpiry } = useAppSettings()

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'out_of_stock' | 'low_stock'>('all')
  const [sortField, setSortField] = useState<'name' | 'stock' | 'value' | 'date'>('name')
  const [sortAsc, setSortAsc] = useState(true)

  // Selection
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter & Date dropdowns
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isDateSortOpen, setIsDateSortOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const dateRef = useRef<HTMLDivElement>(null)

  // Active action menu row ID
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<ProductWithStock | null>(null)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [batchModalProduct, setBatchModalProduct] = useState<ProductWithStock | null>(null)
  const [inspectingProduct, setInspectingProduct] = useState<ProductWithStock | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [adjustingProduct, setAdjustingProduct] = useState<ProductWithStock | null>(null)

  // Click outside listeners
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setIsDateSortOpen(false)
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Categories list
  const categories = useMemo(() => {
    if (!products) return ['All']
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['All', ...Array.from(set).sort()]
  }, [products])

  // Filtered & Sorted products
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
          if (!matchName && !matchSku && !matchCategory && !matchBarcode) return false
        }

        // Category filter
        if (selectedCategory !== 'All' && p.category !== selectedCategory) {
          return false
        }

        // Status filter
        if (statusFilter === 'in_stock' && p.totalStock <= 0) return false
        if (statusFilter === 'out_of_stock' && p.totalStock > 0) return false
        if (statusFilter === 'low_stock' && !p.isLowStock) return false

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
  }, [products, searchQuery, selectedCategory, statusFilter, sortField, sortAsc])

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory, statusFilter])

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage))
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredProducts.slice(start, start + itemsPerPage)
  }, [filteredProducts, currentPage, itemsPerPage])

  // Bulk selection handling
  const allCurrentPageSelected =
    paginatedProducts.length > 0 &&
    paginatedProducts.every((p) => p.id && selectedProductIds.includes(p.id))

  const handleToggleSelectAll = () => {
    if (allCurrentPageSelected) {
      const pageIds = paginatedProducts.map((p) => p.id).filter(Boolean) as number[]
      setSelectedProductIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      const pageIds = paginatedProducts.map((p) => p.id).filter(Boolean) as number[]
      setSelectedProductIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const handleToggleSelectRow = (id?: number) => {
    if (!id) return
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Handlers
  const handleOpenAddProduct = () => {
    setProductToEdit(null)
    setIsProductModalOpen(true)
  }

  const handleOpenEditProduct = (prod: ProductWithStock) => {
    setProductToEdit(prod)
    setIsProductModalOpen(true)
    setActiveMenuId(null)
  }

  const handleOpenReceiveBatch = (prod?: ProductWithStock | null) => {
    setBatchModalProduct(prod || null)
    setIsBatchModalOpen(true)
    setActiveMenuId(null)
  }

  const handleDeleteProduct = async (id?: number) => {
    if (!id) return
    setActiveMenuId(null)
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id)
    }
  }

  const handleExportCSV = () => {
    if (!filteredProducts || filteredProducts.length === 0) return
    const headers = [
      'Product Name',
      'Category',
      'SKU',
      'Incoming Batches',
      'Unit Price (NGN)',
      'In-Stock Qty',
      'Total Value (NGN)',
      'Status',
    ]
    const rows = filteredProducts.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.sku}"`,
      p.activeBatchCount || 0,
      p.suggestedSellingPrice || p.avgSellingPrice,
      p.totalStock,
      p.totalValue,
      p.totalStock > 0 ? 'In-Stock' : 'Out of stock',
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `inventory-summary-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleLoadDemo = async () => {
    await seedSampleInventory()
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header: "Inventory Summary" + "+ Add Product" ───────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Inventory Summary
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          {(!products || products.length === 0) && (
            <button
              onClick={handleLoadDemo}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Load Sample</span>
            </button>
          )}

          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Import Invoice</span>
          </button>

          <button
            onClick={() => handleOpenReceiveBatch()}
            disabled={!products || products.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Receive Batch</span>
          </button>

          <button
            onClick={handleOpenAddProduct}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* ─── 3-Column Metric Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Categories */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-32">
          <div>
            <h3 className="text-base font-semibold text-blue-600">
              Categories
            </h3>
            <p className="text-xl font-bold text-slate-900 mt-2 font-mono">
              Total ({categories.length > 1 ? categories.length - 1 : 0} items)
            </p>
          </div>
          <div className="flex justify-end">
            <span className="text-xs text-slate-400 font-medium">Last week</span>
          </div>
        </div>

        {/* Card 2: Total Product */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-32">
          <div>
            <h3 className="text-base font-semibold text-amber-600">
              Total Product
            </h3>
            <p className="text-xl font-bold text-slate-900 mt-2 font-mono">
              Total {formatNumber(valuation?.totalUnits ?? 0)}
            </p>
          </div>
          <div className="flex justify-end">
            <span className="text-xs text-slate-400 font-medium">Last week</span>
          </div>
        </div>

        {/* Card 3: Low Stock */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-32">
          <div>
            <h3 className="text-base font-semibold text-red-500">
              Low Stock
            </h3>
            <p className="text-xl font-bold text-slate-900 mt-2 font-mono">
              Total ({valuation?.lowStockCount ?? 0} items)
            </p>
          </div>
          <div className="flex justify-end">
            <span className="text-xs text-slate-400 font-medium">Last week</span>
          </div>
        </div>
      </div>

      {/* ─── Main Data Table Container: "Inventory Items" ─────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {/* Table Title */}
        <h3 className="text-base font-semibold text-slate-900 mb-5">
          Inventory Items
        </h3>

        {/* Top Bar: Search Left | Filter, Date, Export Right */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          {/* Left: Search input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-colors"
            />
          </div>

          {/* Right: Filter, Date, Export */}
          <div className="flex items-center gap-2.5">
            {/* Filter Dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                onClick={() => {
                  setIsFilterOpen(!isFilterOpen)
                  setIsDateSortOpen(false)
                }}
                className={`border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors bg-white ${
                  selectedCategory !== 'All' || statusFilter !== 'all'
                    ? 'border-purple-500 text-purple-600 bg-purple-50/50'
                    : ''
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter</span>
                {(selectedCategory !== 'All' || statusFilter !== 'all') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                )}
              </button>

              {/* Filter Popover */}
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl p-4 shadow-lg z-30 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block mb-2">Category</span>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setSelectedCategory(cat)
                            setIsFilterOpen(false)
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between ${
                            selectedCategory === cat
                              ? 'bg-purple-50 text-purple-600 font-semibold'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>{cat}</span>
                          {selectedCategory === cat && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-xs font-semibold text-slate-900 block mb-2">Stock Status</span>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'in_stock', label: 'In-Stock' },
                        { id: 'low_stock', label: 'Low Stock' },
                        { id: 'out_of_stock', label: 'Out of stock' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setStatusFilter(item.id as typeof statusFilter)
                            setIsFilterOpen(false)
                          }}
                          className={`px-2 py-1 rounded text-center border text-xs font-medium ${
                            statusFilter === item.id
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Date / Sort Dropdown */}
            <div className="relative" ref={dateRef}>
              <button
                onClick={() => {
                  setIsDateSortOpen(!isDateSortOpen)
                  setIsFilterOpen(false)
                }}
                className={`border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors bg-white ${
                  sortField !== 'name' ? 'border-purple-500 text-purple-600 bg-purple-50/50' : ''
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Date</span>
              </button>

              {/* Date Sort Popover */}
              {isDateSortOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl p-3 shadow-lg z-30 space-y-1 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block px-2 pb-1">
                    Sort Column
                  </span>
                  {[
                    { id: 'name', label: 'Product Name' },
                    { id: 'date', label: 'Date Added' },
                    { id: 'stock', label: 'In-Stock Qty' },
                    { id: 'value', label: 'Total Value' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        if (sortField === s.id) {
                          setSortAsc(!sortAsc)
                        } else {
                          setSortField(s.id as typeof sortField)
                          setSortAsc(true)
                        }
                        setIsDateSortOpen(false)
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between ${
                        sortField === s.id
                          ? 'bg-purple-50 text-purple-600 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{s.label}</span>
                      {sortField === s.id && (
                        <span className="text-[10px] font-bold">{sortAsc ? 'ASC' : 'DESC'}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export Button (Purple) */}
            <button
              onClick={handleExportCSV}
              disabled={filteredProducts.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3.5 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* ─── Table Content ─────────────────────────────────────────────────── */}
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-xs font-medium">
                <th className="py-3.5 pr-3 w-10">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-3">Product Name</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3">SKU</th>
                <th className="py-3.5 px-3">Incoming row</th>
                <th className="py-3.5 px-3">Unit Price</th>
                <th className="py-3.5 px-3">In-Stock</th>
                <th className="py-3.5 px-3">Total Value</th>
                {showExpiry && <th className="py-3.5 px-3">Expiry Date</th>}
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 pl-3 pr-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((p) => {
                  const isChecked = p.id ? selectedProductIds.includes(p.id) : false
                  const isOutOfStock = p.totalStock <= 0

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-purple-50/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 pr-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectRow(p.id)}
                          className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </td>

                      {/* Product (Image + Name) */}
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          <ProductThumbnail
                            name={p.name}
                            imageUrl={p.imageUrl}
                            category={p.category}
                          />
                          <span className="font-medium text-slate-900 truncate max-w-xs" title={p.name}>
                            {p.name}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-3 text-slate-500 font-medium">
                        {p.category}
                      </td>

                      {/* SKU */}
                      <td className="py-4 px-3 text-slate-500 font-mono text-xs font-medium">
                        {p.sku}
                      </td>

                      {/* Incoming row */}
                      <td className="py-4 px-3 text-slate-600 font-medium font-mono">
                        {p.activeBatchCount || 0}
                      </td>

                      {/* Unit Price (₦ NGN) */}
                      <td className="py-4 px-3 text-slate-900 font-medium font-mono">
                        {formatCurrency(p.suggestedSellingPrice || p.avgSellingPrice)}
                      </td>

                      {/* In-Stock Qty */}
                      <td className="py-4 px-3 text-slate-900 font-medium font-mono">
                        {p.totalStock}
                      </td>

                      {/* Total Value (₦ NGN) */}
                      <td className="py-4 px-3 text-slate-900 font-medium font-mono">
                        {formatCurrency(p.totalValue)}
                      </td>

                      {/* Expiry Date (Dynamic) */}
                      {showExpiry && (
                        <td className="py-4 px-3 text-slate-500 text-xs font-mono">
                          {p.earliestExpiry ? (
                            <span className={p.isExpiringSoon ? 'text-red-500 font-semibold' : ''}>
                              {new Date(p.earliestExpiry).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )}

                      {/* Status Column with Colored Dots */}
                      <td className="py-4 px-3">
                        {isOutOfStock ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                            <span>out of stock</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            <span>In-Stock</span>
                          </div>
                        )}
                      </td>

                      {/* Action Column with Dropdown Menu */}
                      <td className="py-4 pl-3 pr-2 text-right relative">
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === p.id ? null : p.id || null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === p.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-2 top-12 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-1 text-left space-y-0.5 text-xs"
                          >
                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                              <span>Edit Product</span>
                            </button>

                            <button
                              onClick={() => handleOpenReceiveBatch(p)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium"
                            >
                              <Layers className="w-3.5 h-3.5 text-purple-600" />
                              <span>Receive Batch</span>
                            </button>

                            <button
                              onClick={() => {
                                setInspectingProduct(p)
                                setActiveMenuId(null)
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors font-medium"
                            >
                              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                              <span>Inspect Batches</span>
                            </button>

                            <div className="border-t border-slate-100 my-1" />

                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Delete Product</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                /* Empty row state */
                <tr>
                  <td
                    colSpan={showExpiry ? 11 : 10}
                    className="py-12 text-center text-slate-400"
                  >
                    <p className="text-sm font-medium">No inventory items match your search or filters.</p>
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedCategory('All')
                        setStatusFilter('all')
                      }}
                      className="mt-2 text-xs font-semibold text-purple-600 hover:underline"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Bottom Bar: Pagination Controls ─────────────────────────────────── */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="border border-slate-200 rounded-lg px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="border border-slate-200 rounded-lg px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-colors"
            >
              Next
            </button>
          </div>

          <div className="text-xs font-medium text-slate-500">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────────── */}
      {/* Product Modal (Add / Edit) */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      {/* Batch Modal (Receive Stock) */}
      <BatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        preselectedProduct={batchModalProduct}
        products={products || []}
      />

      {/* Batch Inspection Modal */}
      <BatchListModal
        isOpen={Boolean(inspectingProduct)}
        onClose={() => setInspectingProduct(null)}
        product={inspectingProduct}
        onOpenReceiveBatch={(prod) => {
          setInspectingProduct(null)
          handleOpenReceiveBatch(prod)
        }}
      />

      {/* Smart Invoice PDF Importer */}
      <InvoiceImportModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Stock Adjust Modal */}
      <StockAdjustModal
        isOpen={Boolean(adjustingProduct)}
        onClose={() => setAdjustingProduct(null)}
        batch={null}
        productName={adjustingProduct?.name || ''}
      />
    </div>
  )
}
