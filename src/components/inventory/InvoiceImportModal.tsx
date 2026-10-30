import React, { useState, useEffect } from 'react'
import {
  X,
  Upload,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { parseInvoicePDF, parseInvoiceText, type ExtractedInvoiceItem } from '@/services/pdfInvoiceParser'
import { db } from '@/db/database'
import { createProduct } from '@/db/productService'
import { addBatch } from '@/db/fifoService'
import { useAppSettings } from '@/context/AppSettingsContext'
import { formatCurrency } from '@/utils/currency'
import type { Product } from '@/db/models'

interface InvoiceImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const InvoiceImportModal: React.FC<InvoiceImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showExpiry } = useAppSettings()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supplierName, setSupplierName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [stagedItems, setStagedItems] = useState<ExtractedInvoiceItem[]>([])
  const [existingProducts, setExistingProducts] = useState<Product[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null)

  // Load existing products for matching
  useEffect(() => {
    if (isOpen) {
      db.products
        .filter((p) => p.isActive)
        .toArray()
        .then(setExistingProducts)
        .catch(console.error)
    } else {
      // Reset state on close
      setStagedItems([])
      setError(null)
      setSupplierName('')
      setInvoiceNumber('')
      setImportSuccessCount(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Handle PDF file selection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please upload a valid PDF document.')
      return
    }

    setIsProcessing(true)
    setError(null)
    setImportSuccessCount(null)

    try {
      const result = await parseInvoicePDF(file)
      setSupplierName(result.supplierName || file.name.replace('.pdf', ''))
      setInvoiceNumber(result.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`)
      setInvoiceDate(result.invoiceDate || new Date().toISOString().slice(0, 10))

      if (result.items.length === 0) {
        setError(
          'Could not automatically detect item rows in this PDF. You can paste invoice text or add rows manually below.'
        )
      } else {
        // Try to match items with existing products
        const matched = result.items.map((item) => {
          const match = existingProducts.find(
            (p) =>
              p.name.toLowerCase() === item.name.toLowerCase() ||
              (p.sku && p.sku.toLowerCase() === item.sku.toLowerCase())
          )
          if (match) {
            return {
              ...item,
              matchedProductId: match.id,
              isNewProduct: false,
              category: match.category,
              sku: match.sku,
            }
          }
          return item
        })
        setStagedItems(matched)
      }
    } catch (err: unknown) {
      console.error('PDF parsing error:', err)
      setError(
        'Failed to parse PDF document. It may be encrypted or an image scan. You can load sample data or enter items manually.'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // Load sample SME invoice for instant testing
  const handleLoadSample = () => {
    const sampleText = `
INVOICE # INV-2026-9042
Date: 2026-10-28
Supplier: Fidson Healthcare Wholesale Plc

Item Description                     Qty    Unit Price (NGN)    Total (NGN)
Paracetamol 500mg Caplets 10x10      50     450.00              22500.00
Amoxicillin 500mg Capsules 100s      30     2200.00             66000.00
Vitamin C 1000mg Effervescent 20s    40     1800.00             72000.00
Methylated Spirit 70% 500ml          25     950.00              23750.00
    `
    const parsed = parseInvoiceText(sampleText)
    setSupplierName(parsed.supplierName || 'Fidson Healthcare Wholesale Plc')
    setInvoiceNumber(parsed.invoiceNumber || 'INV-2026-9042')
    setInvoiceDate(parsed.invoiceDate || '2026-10-28')

    // Match with existing products
    const matched = parsed.items.map((item) => {
      const match = existingProducts.find(
        (p) => p.name.toLowerCase().includes(item.name.toLowerCase().slice(0, 8))
      )
      if (match) {
        return {
          ...item,
          matchedProductId: match.id,
          isNewProduct: false,
          category: match.category,
          sku: match.sku,
        }
      }
      return item
    })

    setStagedItems(matched)
    setError(null)
  }

  // Item field editing
  const updateItem = (id: string, field: keyof ExtractedInvoiceItem, value: unknown) => {
    setStagedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }

        // Recalculate totals and suggested price if cost changed
        if (field === 'unitCostPrice') {
          const cost = Number(value) || 0
          updated.lineTotal = Math.round(cost * updated.quantity * 100) / 100
          updated.suggestedSellingPrice = Math.round(cost * 1.3)
        }
        if (field === 'quantity') {
          const qty = Number(value) || 0
          updated.lineTotal = Math.round(updated.unitCostPrice * qty * 100) / 100
        }

        return updated
      })
    )
  }

  // Handle product match dropdown change
  const handleProductMatchChange = (itemId: string, selectedValue: string) => {
    setStagedItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        if (selectedValue === 'new') {
          return {
            ...item,
            matchedProductId: undefined,
            isNewProduct: true,
          }
        }
        const prodId = Number(selectedValue)
        const prod = existingProducts.find((p) => p.id === prodId)
        if (prod) {
          return {
            ...item,
            matchedProductId: prod.id,
            name: prod.name,
            sku: prod.sku,
            category: prod.category,
            isNewProduct: false,
          }
        }
        return item
      })
    )
  }

  const removeItem = (id: string) => {
    setStagedItems((prev) => prev.filter((i) => i.id !== id))
  }

  const addNewRow = () => {
    const newItem: ExtractedInvoiceItem = {
      id: `manual-${Date.now()}`,
      name: 'New Product Item',
      sku: `SKU-${Date.now().toString().slice(-5)}`,
      category: 'General',
      quantity: 10,
      unitCostPrice: 1000,
      suggestedSellingPrice: 1300,
      lineTotal: 10000,
      batchNumber: `BAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      confidence: 1,
      isNewProduct: true,
    }
    setStagedItems((prev) => [...prev, newItem])
  }

  // Calculate totals
  const totalCost = stagedItems.reduce((sum, item) => sum + item.unitCostPrice * item.quantity, 0)
  const totalUnits = stagedItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalProjectedRevenue = stagedItems.reduce(
    (sum, item) => sum + item.suggestedSellingPrice * item.quantity,
    0
  )
  const totalProjectedProfit = totalProjectedRevenue - totalCost

  // Commit batch import to IndexedDB
  const handleImportBatches = async () => {
    if (stagedItems.length === 0) return

    setIsImporting(true)
    setError(null)

    try {
      let importedCount = 0

      for (const item of stagedItems) {
        let productId = item.matchedProductId

        // 1. If new product, create it first
        if (!productId || item.isNewProduct) {
          try {
            productId = await createProduct(
              {
                name: item.name,
                sku: item.sku,
                category: item.category || 'General',
                unit: 'pcs',
                reorderLevel: 5,
              },
              'system',
              'Smart Invoice Importer'
            )
          } catch {
            // If SKU conflict, create with unique SKU
            productId = await createProduct(
              {
                name: item.name,
                sku: `${item.sku}-${Date.now().toString().slice(-4)}`,
                category: item.category || 'General',
                unit: 'pcs',
                reorderLevel: 5,
              },
              'system',
              'Smart Invoice Importer'
            )
          }
        }

        // 2. Add incoming batch
        const defaultExpiry = showExpiry
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : undefined

        const expiryDate = item.expiryDate
          ? new Date(item.expiryDate)
          : defaultExpiry

        await addBatch({
          productId: productId!,
          batchNumber: item.batchNumber || `BAT-${Date.now()}`,
          costPrice: item.unitCostPrice,
          sellingPrice: item.suggestedSellingPrice,
          initialQty: item.quantity,
          remainingQty: item.quantity,
          receivedDate: invoiceDate ? new Date(invoiceDate) : new Date(),
          expiryDate: expiryDate || null,
        })

        importedCount++
      }

      // Record invoice import audit log
      await db.auditLogs.add({
        staffId: 'system',
        staffName: 'Smart Invoice Importer',
        action: 'batch_received',
        entity: 'batch',
        details: `Imported supplier invoice "${invoiceNumber}" (${supplierName || 'Unknown'}): ${importedCount} batches, Total ${formatCurrency(totalCost)}`,
        metadata: {
          supplierName,
          invoiceNumber,
          totalCost,
          itemCount: importedCount,
        },
        timestamp: new Date(),
      })

      setImportSuccessCount(importedCount)
      onSuccess()
    } catch (err: unknown) {
      console.error('Batch import failed:', err)
      setError('Failed to commit invoice batches to database. Please review the inputs and retry.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl my-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-purple-950/40 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Smart Invoice PDF Parser</span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Client-Side OCR / Regex
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Upload supplier invoice PDFs to auto-extract line items, unit costs, and add inventory batches
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Success Banner */}
          {importSuccessCount !== null && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-sm font-medium text-emerald-300">
                  Successfully imported {importSuccessCount} batch(es) into Pika inventory!
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              >
                Close & View Stock
              </button>
            </div>
          )}

          {/* Upload Area / Dropzone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 border-2 border-dashed border-slate-700/80 hover:border-purple-500/50 rounded-xl p-6 text-center bg-slate-800/30 hover:bg-slate-800/50 transition-all flex flex-col items-center justify-center relative group">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 mb-2 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">
                {isProcessing ? 'Analyzing & Extracting PDF Text...' : 'Click or Drag & Drop Supplier Invoice PDF'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                Runs 100% locally in your browser via pdfjs-dist. Zero cloud uploads or external API keys needed.
              </p>
            </div>

            {/* Quick Actions & Demo */}
            <div className="flex flex-col justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Instant Demo
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Don't have a supplier PDF on hand? Load realistic Nigerian SME pharma/retail invoice data with one click:
                </p>
              </div>

              <button
                type="button"
                onClick={handleLoadSample}
                className="w-full py-2 px-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span>Load Sample SME Invoice</span>
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Metadata Strip */}
          {stagedItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">
                  Supplier / Vendor
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Fidson Healthcare"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">
                  Invoice / Bill #
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-9042"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Staging Items Table */}
          {stagedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    Extracted Line Items ({stagedItems.length})
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Review and edit product mappings, cost prices, and margins before saving.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addNewRow}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-700/80 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Catalog Mapping</th>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-2">Qty</th>
                      <th className="py-2.5 px-3">Unit Cost (₦)</th>
                      <th className="py-2.5 px-3">Target Price (₦)</th>
                      <th className="py-2.5 px-2">Margin</th>
                      {showExpiry && <th className="py-2.5 px-3">Expiry Date</th>}
                      <th className="py-2.5 px-3 text-right">Line Total (₦)</th>
                      <th className="py-2.5 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {stagedItems.map((item) => {
                      const marginPct =
                        item.unitCostPrice > 0
                          ? Math.round(
                              ((item.suggestedSellingPrice - item.unitCostPrice) /
                                item.unitCostPrice) *
                                100
                            )
                          : 0

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Catalog Match Selector */}
                          <td className="py-2 px-3 w-44">
                            <select
                              value={item.matchedProductId ? String(item.matchedProductId) : 'new'}
                              onChange={(e) => handleProductMatchChange(item.id, e.target.value)}
                              className="w-full py-1 px-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            >
                              <option value="new">+ Create as New Product</option>
                              <optgroup label="Map to Existing Catalog:">
                                {existingProducts.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                          </td>

                          {/* Product Name */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                              className="w-full py-1 px-2 bg-slate-800/80 border border-slate-700 rounded text-white text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                          </td>

                          {/* Quantity */}
                          <td className="py-2 px-2 w-20">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(item.id, 'quantity', Math.max(1, Number(e.target.value)))
                              }
                              className="w-full py-1 px-2 bg-slate-800/80 border border-slate-700 rounded text-white text-xs text-right focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                          </td>

                          {/* Unit Cost Price */}
                          <td className="py-2 px-3 w-28">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitCostPrice}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  'unitCostPrice',
                                  Math.max(0, parseFloat(e.target.value) || 0)
                                )
                              }
                              className="w-full py-1 px-2 bg-slate-800/80 border border-slate-700 rounded text-emerald-400 font-mono text-xs text-right focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                          </td>

                          {/* Target Selling Price */}
                          <td className="py-2 px-3 w-28">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.suggestedSellingPrice}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  'suggestedSellingPrice',
                                  Math.max(0, parseFloat(e.target.value) || 0)
                                )
                              }
                              className="w-full py-1 px-2 bg-slate-800/80 border border-slate-700 rounded text-purple-300 font-mono text-xs text-right focus:ring-1 focus:ring-purple-500 focus:outline-none"
                            />
                          </td>

                          {/* Margin % */}
                          <td className="py-2 px-2 text-center">
                            <span
                              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                marginPct >= 20
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : marginPct > 0
                                  ? 'text-amber-400 bg-amber-500/10'
                                  : 'text-rose-400 bg-rose-500/10'
                              }`}
                            >
                              {marginPct}%
                            </span>
                          </td>

                          {/* Expiry Date (optional based on business mode) */}
                          {showExpiry && (
                            <td className="py-2 px-3 w-32">
                              <input
                                type="date"
                                value={item.expiryDate || ''}
                                onChange={(e) => updateItem(item.id, 'expiryDate', e.target.value)}
                                className="w-full py-1 px-2 bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                              />
                            </td>
                          )}

                          {/* Line Total */}
                          <td className="py-2 px-3 text-right font-mono text-slate-200">
                            {formatCurrency(item.lineTotal)}
                          </td>

                          {/* Action */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Staged Items Aggregate Summary Cards */}
          {stagedItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
                  Items / Units
                </span>
                <span className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
                  <Package className="w-4 h-4 text-purple-400" />
                  {stagedItems.length} items ({totalUnits} pcs)
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
                  Acquisition Cost
                </span>
                <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                  {formatCurrency(totalCost)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
                  Projected Revenue
                </span>
                <span className="text-base font-bold text-purple-300 font-mono mt-0.5 block">
                  {formatCurrency(totalProjectedRevenue)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
                  Projected Gross Profit
                </span>
                <span className="text-base font-bold text-cyan-400 font-mono flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  {formatCurrency(totalProjectedProfit)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur sticky bottom-0 z-10">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Batches will be tracked using strict FIFO rules upon inventory reception.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleImportBatches}
              disabled={stagedItems.length === 0 || isImporting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-medium text-xs shadow-lg shadow-purple-600/30 disabled:opacity-50 transition-all"
            >
              <span>
                {isImporting
                  ? 'Importing Batches...'
                  : `Confirm & Import ${stagedItems.length} Lot(s)`}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
