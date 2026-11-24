import { useState, useMemo, useRef } from 'react'
import { X, Printer, Search, Plus, Minus, Tag } from 'lucide-react'
import type { ProductWithStock } from '@/db'
import { encodeCode128 } from '@/utils/barcode'
import { formatCurrency } from '@/utils/currency'
import { useAppSettings } from '@/context/AppSettingsContext'

interface BarcodeLabelModalProps {
  isOpen: boolean
  onClose: () => void
  products: ProductWithStock[]
  preselectedProduct?: ProductWithStock | null
}

const LABEL_SIZES: Record<string, { width: number; height: number; name: string }> = {
  '40x30': { width: 40, height: 30, name: '40 × 30 mm (Standard Sticker)' },
  '50x30': { width: 50, height: 30, name: '50 × 30 mm' },
  '50x25': { width: 50, height: 25, name: '50 × 25 mm' },
  '58x40': { width: 58, height: 40, name: '58 × 40 mm (Large Barcode)' },
  '60x40': { width: 60, height: 40, name: '60 × 40 mm' },
}

export function BarcodeLabelModal({
  isOpen,
  onClose,
  products,
  preselectedProduct,
}: BarcodeLabelModalProps) {
  const { storeName } = useAppSettings()

  // Label configuration
  const [selectedSize, setSelectedSize] = useState<string>('40x30')
  const [priceMode, setPriceMode] = useState<'retail' | 'wholesale' | 'both' | 'none'>('retail')
  const [showStoreName, setShowStoreName] = useState(true)
  const [showBarcode, setShowBarcode] = useState(true)

  // Search & product quantity map
  const [searchQuery, setSearchQuery] = useState('')
  const [quantities, setQuantities] = useState<Record<number, number>>(() => {
    if (preselectedProduct?.id) {
      return { [preselectedProduct.id]: 1 }
    }
    return {}
  })

  const printAreaRef = useRef<HTMLDivElement>(null)

  // Filtered products list
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products.slice(0, 50)
    const q = searchQuery.toLowerCase().trim()
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q))
      )
      .slice(0, 50)
  }, [products, searchQuery])

  // Total labels to print
  const totalLabelsCount = useMemo(() => {
    return Object.values(quantities).reduce((sum, q) => sum + (q || 0), 0)
  }, [quantities])

  const productsToPrint = useMemo(() => {
    return products.filter((p) => p.id && (quantities[p.id] || 0) > 0)
  }, [products, quantities])

  const previewProduct = useMemo(() => {
    return productsToPrint[0] || preselectedProduct || products[0] || null
  }, [productsToPrint, preselectedProduct, products])

  if (!isOpen) return null

  const handleUpdateQty = (productId: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const copy = { ...prev }
        delete copy[productId]
        return copy
      }
      return { ...prev, [productId]: next }
    })
  }

  const handleSetOneEach = () => {
    const updated: Record<number, number> = { ...quantities }
    for (const p of filteredProducts) {
      if (p.id) {
        updated[p.id] = Math.max(1, updated[p.id] || 1)
      }
    }
    setQuantities(updated)
  }

  const handleClear = () => {
    setQuantities({})
  }

  const handlePrint = () => {
    if (totalLabelsCount === 0) return

    const { width, height } = LABEL_SIZES[selectedSize] || { width: 40, height: 30 }

    // Inject @page size style for printing
    let styleEl = document.getElementById('barcode-label-print-style')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'barcode-label-print-style'
      document.head.appendChild(styleEl)
    }

    styleEl.textContent = `
      @media print {
        @page {
          size: ${width}mm ${height}mm;
          margin: 0 !important;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        .barcode-label-item {
          width: ${width}mm !important;
          height: ${height}mm !important;
          page-break-after: always;
          break-after: page;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          padding: 1.5mm 2mm !important;
        }
      }
    `

    setTimeout(() => {
      window.print()
    }, 100)
  }

  // Render SVG barcode
  const renderBarcodeSvg = (code: string) => {
    const { viewBox, rectsSvg } = encodeCode128(code)
    return (
      <svg
        viewBox={viewBox}
        preserveAspectRatio="none"
        className="w-full h-6 object-contain"
        dangerouslySetInnerHTML={{ __html: `<g fill="#000">${rectsSvg}</g>` }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:static print:inset-auto print:p-0 print:m-0 print:bg-transparent print:block">
      {/* ─── Printable Document Area (visible only during window.print) ─── */}
      <div
        ref={printAreaRef}
        id="printable-barcode-sheet"
        className="hidden print:block print:w-auto print:h-auto"
      >
        {productsToPrint.map((p) => {
          const qty = p.id ? quantities[p.id] || 0 : 0
          const codeToEncode = p.barcode || p.sku

          return Array.from({ length: qty }).map((_, index) => (
            <div
              key={`${p.id}-${index}`}
              className="barcode-label-item font-sans text-black leading-tight text-center"
            >
              {/* Store Name Header */}
              {showStoreName && (
                <div className="text-[8px] font-bold uppercase tracking-wider text-gray-700 truncate">
                  {storeName || 'Pika SME'}
                </div>
              )}

              {/* Product Title */}
              <div className="text-[10px] font-bold text-black line-clamp-1 truncate">
                {p.name}
              </div>

              {/* Price Tags */}
              {priceMode !== 'none' && (
                <div className="text-center font-mono my-0.5">
                  {priceMode === 'retail' && (
                    <div className="text-[12px] font-extrabold text-black">
                      {formatCurrency(p.suggestedSellingPrice || p.avgSellingPrice)}
                      <span className="text-[8px] font-normal font-sans text-gray-500"> /pc</span>
                    </div>
                  )}
                  {priceMode === 'wholesale' && (
                    <div className="text-[11px] font-extrabold text-black">
                      {formatCurrency(p.wholesalePrice || (p.suggestedSellingPrice || 0) * (p.piecesPerCarton || 1))}
                      <span className="text-[8px] font-normal font-sans text-gray-500"> /ctn</span>
                    </div>
                  )}
                  {priceMode === 'both' && (
                    <div className="text-[9px] font-bold text-black flex items-center justify-center gap-2">
                      <span>{formatCurrency(p.suggestedSellingPrice || p.avgSellingPrice)}<small>/pc</small></span>
                      <span>•</span>
                      <span>{formatCurrency(p.wholesalePrice || (p.suggestedSellingPrice || 0) * (p.piecesPerCarton || 1))}<small>/ctn</small></span>
                    </div>
                  )}
                </div>
              )}

              {/* Barcode Vector & Code */}
              {showBarcode && (
                <div className="w-full flex flex-col items-center justify-center">
                  {renderBarcodeSvg(codeToEncode)}
                  <div className="text-[8px] font-mono font-semibold tracking-wider text-black mt-0.5">
                    {codeToEncode}
                  </div>
                </div>
              )}
            </div>
          ))
        })}
      </div>

      {/* ─── Interactive Dialog Container (screen only) ─── */}
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl animate-scale-in no-print print:hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Barcode & Price Sticker Generator
              </h2>
              <p className="text-xs text-slate-500">
                Print barcode price tags for retail shelves and product packaging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Controls Row: Size, Price Mode, Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            {/* Label Size */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Label Format
              </label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {Object.entries(LABEL_SIZES).map(([key, opt]) => (
                  <option key={key} value={key}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Option */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Price Display
              </label>
              <select
                value={priceMode}
                onChange={(e) => setPriceMode(e.target.value as typeof priceMode)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="retail">Retail / Piece (₦)</option>
                <option value="wholesale">Wholesale / Carton (₦)</option>
                <option value="both">Both Retail & Wholesale</option>
                <option value="none">No Price (Barcode Only)</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="flex flex-col justify-center space-y-1.5 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Include Shop Name</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={showBarcode}
                  onChange={(e) => setShowBarcode(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500"
                />
                <span>Include Barcode</span>
              </label>
            </div>
          </div>

          {/* Live Preview Card */}
          {previewProduct && (
            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-purple-300 bg-purple-50/40">
              <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider mb-2">
                Live Label Preview
              </span>
              <div className="w-56 p-3 rounded-lg bg-white border border-slate-300 shadow-sm text-center font-sans space-y-1">
                {showStoreName && (
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                    {storeName || 'Pika SME'}
                  </div>
                )}
                <div className="text-xs font-bold text-slate-900 truncate">
                  {previewProduct.name}
                </div>
                {priceMode !== 'none' && (
                  <div className="text-sm font-extrabold text-slate-900 font-mono">
                    {priceMode === 'retail' && formatCurrency(previewProduct.suggestedSellingPrice || previewProduct.avgSellingPrice)}
                    {priceMode === 'wholesale' &&
                      formatCurrency(
                        previewProduct.wholesalePrice ||
                          (previewProduct.suggestedSellingPrice || 0) * (previewProduct.piecesPerCarton || 1)
                      )}
                    {priceMode === 'both' && (
                      <span className="text-[10px]">
                        {formatCurrency(previewProduct.suggestedSellingPrice || 0)} /pc •{' '}
                        {formatCurrency(previewProduct.wholesalePrice || 0)} /ctn
                      </span>
                    )}
                  </div>
                )}
                {showBarcode && (
                  <div className="pt-1">
                    {renderBarcodeSvg(previewProduct.barcode || previewProduct.sku)}
                    <div className="text-[9px] font-mono text-slate-600 mt-0.5">
                      {previewProduct.barcode || previewProduct.sku}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Product Selection Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products to print..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetOneEach}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                >
                  +1 Each for Shown
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const qty = p.id ? quantities[p.id] || 0 : 0
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-semibold text-slate-800 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {p.sku} {p.barcode ? `• Barcode: ${p.barcode}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => p.id && handleUpdateQty(p.id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center font-mono font-bold text-xs text-slate-900">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => p.id && handleUpdateQty(p.id, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="text-xs font-medium text-slate-600">
            {totalLabelsCount > 0 ? (
              <span className="font-semibold text-purple-700">
                Ready to print {totalLabelsCount} sticker label{totalLabelsCount === 1 ? '' : 's'} ({productsToPrint.length} product{productsToPrint.length === 1 ? '' : 's'})
              </span>
            ) : (
              <span>Select products and label quantities above</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={totalLabelsCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print {totalLabelsCount > 0 ? `${totalLabelsCount} Labels` : 'Labels'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
