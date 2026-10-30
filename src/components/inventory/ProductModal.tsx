import { useState, useEffect } from 'react'
import { X, Sparkles, Barcode, AlertCircle, Check } from 'lucide-react'
import type { Product } from '@/db'
import {
  createProduct,
  updateProduct,
  generateSuggestedSKU,
  generateBarcode,
} from '@/db'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  productToEdit?: Product | null
  onSuccess?: () => void
}

const CATEGORY_PRESETS = [
  'Beverages',
  'Dairy & Eggs',
  'Bakery',
  'Pantry & Staples',
  'Snacks & Confectionery',
  'Meat & Poultry',
  'Fresh Produce',
  'Household & Cleaning',
  'Personal Care',
  'General Merchandise',
]

const UNIT_PRESETS = ['pcs', 'bag', 'bottle', 'box', 'can', 'kg', 'g', 'pack', 'carton', 'loaf']

export function ProductModal({
  isOpen,
  onClose,
  productToEdit,
  onSuccess,
}: ProductModalProps) {
  const isEditing = Boolean(productToEdit)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState(CATEGORY_PRESETS[0])
  const [customCategory, setCustomCategory] = useState('')
  const [unit, setUnit] = useState(UNIT_PRESETS[0])
  const [reorderLevel, setReorderLevel] = useState('5')
  const [barcode, setBarcode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name)
      setSku(productToEdit.sku)
      if (CATEGORY_PRESETS.includes(productToEdit.category)) {
        setCategory(productToEdit.category)
        setCustomCategory('')
      } else {
        setCategory('Custom')
        setCustomCategory(productToEdit.category)
      }
      setUnit(productToEdit.unit || UNIT_PRESETS[0])
      setReorderLevel(String(productToEdit.reorderLevel))
      setBarcode(productToEdit.barcode || '')
    } else {
      // Defaults for new product
      setName('')
      setSku('')
      setCategory(CATEGORY_PRESETS[0])
      setCustomCategory('')
      setUnit(UNIT_PRESETS[0])
      setReorderLevel('5')
      setBarcode('')
    }
    setError(null)
  }, [productToEdit, isOpen])

  if (!isOpen) return null

  const handleGenerateSKU = () => {
    const finalCat = category === 'Custom' ? customCategory : category
    setSku(generateSuggestedSKU(name, finalCat))
  }

  const handleGenerateBarcode = () => {
    setBarcode(generateBarcode())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Product name is required.')
      return
    }

    if (!sku.trim()) {
      setError('SKU is required.')
      return
    }

    const finalCategory =
      category === 'Custom' ? customCategory.trim() : category
    if (!finalCategory) {
      setError('Please specify a category.')
      return
    }

    const reorderVal = parseInt(reorderLevel, 10)
    if (isNaN(reorderVal) || reorderVal < 0) {
      setError('Reorder level must be a non-negative number.')
      return
    }

    try {
      setIsSubmitting(true)
      if (isEditing && productToEdit?.id) {
        await updateProduct(productToEdit.id, {
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: finalCategory,
          unit: unit.trim(),
          reorderLevel: reorderVal,
          barcode: barcode.trim(),
        })
      } else {
        await createProduct({
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: finalCategory,
          unit: unit.trim(),
          reorderLevel: reorderVal,
          barcode: barcode.trim(),
        })
      }

      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save product.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-2xl shadow-pika-950/40 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50">
          <div>
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              {isEditing
                ? 'Update catalog metadata and inventory thresholds'
                : 'Define core item parameters for tracking and FIFO batches'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arabica Signature Coffee Beans (1kg)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
            />
          </div>

          {/* SKU & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-surface-700 dark:text-surface-300">
                  SKU Code *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSKU}
                  className="flex items-center gap-1 text-[11px] font-semibold text-pika-600 dark:text-pika-400 hover:underline"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-generate
                </button>
              </div>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. BEV-COF-01"
                className="w-full font-mono uppercase px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              >
                {CATEGORY_PRESETS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Custom">+ Custom Category...</option>
              </select>
            </div>
          </div>

          {category === 'Custom' && (
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Custom Category Name
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              />
            </div>
          )}

          {/* Unit & Reorder Level Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unit */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Unit of Measure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              >
                {UNIT_PRESETS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            {/* Reorder Level */}
            <div>
              <label className="block text-xs font-semibold text-surface-700 dark:text-surface-300 mb-1">
                Low Stock Threshold (Reorder Level)
              </label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
              />
            </div>
          </div>

          {/* Barcode */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-surface-700 dark:text-surface-300">
                Barcode / EAN (Optional)
              </label>
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="flex items-center gap-1 text-[11px] font-semibold text-pika-600 dark:text-pika-400 hover:underline"
              >
                <Barcode className="w-3 h-3" />
                Generate Code
              </button>
            </div>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 201948201938 or scan with barcode reader"
              className="w-full font-mono px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-200 dark:border-surface-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pika-600 to-pika-700 hover:from-pika-700 hover:to-pika-800 text-white text-sm font-semibold shadow-lg shadow-pika-600/25 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Save Changes' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
