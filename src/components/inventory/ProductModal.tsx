import { useState, useEffect, useRef } from 'react'
import { X, Sparkles, Barcode, AlertCircle, Check, Camera, Trash2 } from 'lucide-react'
import type { Product } from '@/db'
import {
  createProduct,
  updateProduct,
  generateSuggestedSKU,
  generateBarcode,
} from '@/db'
import { useAppSettings } from '@/context/AppSettingsContext'

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
  const { businessMode } = useAppSettings()
  const showBarcode = businessMode !== 'no_expiry'

  const isEditing = Boolean(productToEdit)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [category, setCategory] = useState(CATEGORY_PRESETS[0])
  const [customCategory, setCustomCategory] = useState('')
  const [unit, setUnit] = useState(UNIT_PRESETS[0])
  const [reorderLevel, setReorderLevel] = useState('5')
  const [piecesPerCarton, setPiecesPerCarton] = useState('1')
  const [wholesalePrice, setWholesalePrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [barcode, setBarcode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

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
      setPiecesPerCarton(String(productToEdit.piecesPerCarton || 1))
      setWholesalePrice(productToEdit.wholesalePrice !== undefined ? String(productToEdit.wholesalePrice) : '')
      setImageUrl(productToEdit.imageUrl || '')
      setBarcode(productToEdit.barcode || '')
    } else {
      // Defaults for new product
      setName('')
      setSku('')
      setCategory(CATEGORY_PRESETS[0])
      setCustomCategory('')
      setUnit(UNIT_PRESETS[0])
      setReorderLevel('5')
      setPiecesPerCarton('1')
      setWholesalePrice('')
      setImageUrl('')
      setBarcode('')
    }
    setError(null)
  }, [productToEdit, isOpen])

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const maxDim = 320
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            const compressed = canvas.toDataURL('image/jpeg', 0.8)
            setImageUrl(compressed)
          }
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    } catch {
      setError('Could not process that image.')
    }
  }

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

    const ppcVal = parseInt(piecesPerCarton, 10)
    if (isNaN(ppcVal) || ppcVal < 1) {
      setError('Pieces per carton must be at least 1.')
      return
    }

    const wholesaleVal = wholesalePrice.trim() ? parseFloat(wholesalePrice) : undefined
    if (wholesaleVal !== undefined && (isNaN(wholesaleVal) || wholesaleVal < 0)) {
      setError('Wholesale price must be a valid positive number.')
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
          piecesPerCarton: ppcVal,
          wholesalePrice: wholesaleVal,
          imageUrl: imageUrl.trim() || undefined,
          barcode: showBarcode ? barcode.trim() : '',
        })
      } else {
        await createProduct({
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: finalCategory,
          unit: unit.trim(),
          reorderLevel: reorderVal,
          piecesPerCarton: ppcVal,
          wholesalePrice: wholesaleVal,
          imageUrl: imageUrl.trim() || undefined,
          barcode: showBarcode ? barcode.trim() : '',
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
        className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-2xl shadow-purple-900/20 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/60">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-xs text-slate-400">
              {isEditing
                ? 'Update catalog metadata and inventory thresholds'
                : 'Define core item parameters for tracking and FIFO batches'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all duration-200 ease-in-out active:scale-95"
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

          {/* Product Name & Photo Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Image Thumbnail / Picker */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Photo
              </label>
              <div className="flex items-center gap-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border border-dashed border-slate-300 hover:border-purple-500 bg-slate-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors group relative"
                  title="Upload product image"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={name || 'Product'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-purple-600">
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span className="text-[9px] font-semibold">Photo</span>
                    </div>
                  )}
                </div>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
            </div>

            {/* Product Name */}
            <div className="flex-1 w-full">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arabica Signature Coffee Beans (1kg)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ease-in-out"
              />
            </div>
          </div>

          {/* SKU & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  SKU Code *
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSKU}
                  className="flex items-center gap-1 text-[11px] font-semibold text-purple-500 hover:text-purple-400 hover:underline active:scale-95 transition-all duration-200 ease-in-out"
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
                className="w-full font-mono uppercase px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ease-in-out"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ease-in-out"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Custom Category Name
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ease-in-out"
              />
            </div>
          )}

          {/* Unit & Reorder Level Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unit */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ease-in-out"
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
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Low Stock Threshold (Reorder Level)
              </label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                placeholder="5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ease-in-out"
              />
            </div>
          </div>

          {/* Wholesale & Carton Pricing (GTTG Packaging Standards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl bg-purple-50/50 border border-purple-100">
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-1">
                Pieces per Carton (PPC)
              </label>
              <input
                type="number"
                min="1"
                value={piecesPerCarton}
                onChange={(e) => setPiecesPerCarton(e.target.value)}
                placeholder="1 (Default: loose unit)"
                className="w-full px-3.5 py-2 rounded-lg border border-purple-200 bg-white text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[10px] text-purple-600 mt-0.5 block">
                Number of individual pieces in 1 wholesale carton
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-1">
                Wholesale Price / Carton (₦)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
                placeholder="e.g. 55000"
                className="w-full px-3.5 py-2 rounded-lg border border-purple-200 bg-white text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[10px] text-purple-600 mt-0.5 block">
                Bulk/Carton selling price for wholesale buyers
              </span>
            </div>
          </div>

          {/* Barcode (Conditional on business mode) */}
          {showBarcode && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Barcode / EAN (Optional)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="flex items-center gap-1 text-[11px] font-semibold text-purple-500 hover:text-purple-400 hover:underline active:scale-95 transition-all duration-200 ease-in-out"
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
                className="w-full font-mono px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ease-in-out"
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold active:scale-95 transition-all duration-200 ease-in-out"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-lg shadow-purple-900/20 active:scale-95 transition-all duration-200 ease-in-out disabled:opacity-50"
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
