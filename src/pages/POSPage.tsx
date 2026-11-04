import { useState, useEffect, useMemo, useRef } from 'react'
import {
  ShoppingCart,
  Barcode,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  Building,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Percent,
  RotateCcw,
  Tag,
  Edit2,
  Check,
  Search,
} from 'lucide-react'
import type { ProductWithStock, CartItem, PaymentMethod, SaleWithItems } from '@/db'
import { useProducts } from '@/hooks/useDatabase'
import { processSale, getSaleWithItems } from '@/db'
import { useAuth } from '@/context/AuthContext'
import { useAppSettings } from '@/context/AppSettingsContext'
import { ReceiptModal } from '@/components/pos/ReceiptModal'
import { formatCurrency } from '@/utils/currency'

export function POSPage() {
  const products = useProducts()
  const { currentStaff } = useAuth()
  const { businessMode, isNoExpiry, showExpiry } = useAppSettings()

  // State
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [cart, setCart] = useState<CartItem[]>([])

  // Dynamic pricing state: track which item is currently being edited
  const [editingPriceProductId, setEditingPriceProductId] = useState<number | null>(null)
  const [tempCustomPrice, setTempCustomPrice] = useState<string>('')
  const [tempVarianceNote, setTempVarianceNote] = useState<string>('')

  // Financial adjustments
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat')
  const [discountValue, setDiscountValue] = useState<string>('0')
  const [includeTax, setIncludeTax] = useState(false)
  const [taxRate] = useState(7.5) // standard 7.5% VAT

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [cashTendered, setCashTendered] = useState<string>('')
  const [customerName] = useState('')
  const [notes] = useState('')

  // Checkout submission & Receipt
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [completedSale, setCompletedSale] = useState<SaleWithItems | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Categories list
  const categories = useMemo(() => {
    if (!products) return ['All']
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
    return ['All', ...cats.sort()]
  }, [products])

  // Filtered products for cashier grid
  const filteredProducts = useMemo(() => {
    if (!products) return []
    return products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchBarcode = !isNoExpiry && p.barcode ? p.barcode.toLowerCase().includes(q) : false
        const match =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          matchBarcode
        if (!match) return false
      }
      return true
    })
  }, [products, selectedCategory, searchQuery, isNoExpiry])

  // Barcode enter key or exact search match
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const query = searchQuery.trim().toLowerCase()
      if (!query) return

      const exactMatch = products?.find(
        (p) =>
          (!isNoExpiry && p.barcode && p.barcode.toLowerCase() === query) ||
          p.sku.toLowerCase() === query
      )

      if (exactMatch && exactMatch.totalStock > 0) {
        addToCart(exactMatch)
        setSearchQuery('')
      }
    }
  }

  // Add product to cart
  const addToCart = (product: ProductWithStock) => {
    if (product.totalStock <= 0) return

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        if (existing.quantity >= product.totalStock) {
          return prev // Max stock reached
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        const effectiveSellingPrice = product.suggestedSellingPrice || 0

        const newItem: CartItem = {
          productId: product.id!,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice: effectiveSellingPrice,
          maxAvailable: product.totalStock,
          batches: [],
        }
        return [...prev, newItem]
      }
    })
  }

  // Update item quantity
  const updateQuantity = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId)
      return
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const qty = Math.min(newQty, item.maxAvailable)
          return { ...item, quantity: qty }
        }
        return item
      })
    )
  }

  // Remove item from cart
  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
    if (editingPriceProductId === productId) {
      setEditingPriceProductId(null)
    }
  }

  // Clear entire cart
  const clearCart = () => {
    setCart([])
    setDiscountValue('0')
    setCashTendered('')
    setCheckoutError(null)
    setEditingPriceProductId(null)
  }

  // Start editing unit price
  const startEditingPrice = (item: CartItem) => {
    setEditingPriceProductId(item.productId)
    setTempCustomPrice(
      item.customPrice !== undefined ? String(item.customPrice) : String(item.unitPrice)
    )
    setTempVarianceNote(item.varianceNote || '')
  }

  // Save negotiated custom price
  const saveCustomPrice = (productId: number) => {
    const val = parseFloat(tempCustomPrice)
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid non-negative selling price.')
      return
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          return {
            ...item,
            customPrice: val,
            varianceNote: tempVarianceNote.trim() || undefined,
          }
        }
        return item
      })
    )
    setEditingPriceProductId(null)
  }

  // Reset custom price
  const resetCustomPrice = (productId: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const updated = { ...item }
          delete updated.customPrice
          delete updated.varianceNote
          return updated
        }
        return item
      })
    )
    if (editingPriceProductId === productId) {
      setEditingPriceProductId(null)
    }
  }

  // Financial computations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = item.customPrice !== undefined ? item.customPrice : item.unitPrice
      return sum + price * item.quantity
    }, 0)
  }, [cart])

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0
    if (discountType === 'percent') {
      return Math.min(subtotal, Math.round((subtotal * Math.min(val, 100)) / 100))
    }
    return Math.min(subtotal, val)
  }, [subtotal, discountType, discountValue])

  const taxAmount = useMemo(() => {
    if (!includeTax) return 0
    const taxableAmount = Math.max(0, subtotal - discountAmount)
    return Math.round((taxableAmount * taxRate) / 100)
  }, [subtotal, discountAmount, includeTax, taxRate])

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + taxAmount)
  }, [subtotal, discountAmount, taxAmount])

  // Cash change calculation
  const tenderedNum = parseFloat(cashTendered) || 0
  const cashChange = paymentMethod === 'cash' && tenderedNum > grandTotal
    ? tenderedNum - grandTotal
    : 0

  const handleSetQuickCash = (amt: number) => {
    setCashTendered(String(amt))
  }

  // Process checkout transaction
  const handleCheckout = async () => {
    if (cart.length === 0) return

    if (paymentMethod === 'cash' && tenderedNum > 0 && tenderedNum < grandTotal) {
      setCheckoutError(
        `Insufficient cash tendered. Total is ${formatCurrency(grandTotal)}, but ${formatCurrency(tenderedNum)} was provided.`
      )
      return
    }

    try {
      setIsProcessing(true)
      setCheckoutError(null)

      const result = await processSale({
        cartItems: cart,
        paymentMethod,
        discount: discountAmount,
        tax: taxAmount,
        staffId: currentStaff?.id ? String(currentStaff.id) : '1',
        staffName: currentStaff?.name || 'Cashier',
        customerName: customerName.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      if (result.saleId) {
        const saleDetails = await getSaleWithItems(result.saleId)
        setCompletedSale(saleDetails)
      }
      setIsReceiptOpen(true)
      clearCart()
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-4 no-print print:hidden">
        {/* Top Banner: Status & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Point of Sale Checkout
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Offline-ready checkout engine with strict FIFO lot depletion & dynamic pricing
            </p>
          </div>
        </div>

        {/* Offline Badge, Mode Badge & Search/Barcode input */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-purple-500/20 bg-purple-500/10 text-purple-400">
            <span>
              {isNoExpiry ? 'Non-Expiry Mode' : businessMode === 'expiry_only' ? 'Strict Expiry Mode' : 'Hybrid Store'}
            </span>
          </div>

          {/* Online/Offline status */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Online (Local-First Sync)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>100% Offline Active</span>
              </>
            )}
          </div>

          {/* Conditional Search / Barcode Bar */}
          <div className="relative w-full sm:w-64">
            {isNoExpiry ? (
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            ) : (
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            )}
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder={isNoExpiry ? 'Search product name or SKU...' : 'Scan Barcode or Search SKU...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ease-in-out"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Products on Left (7 cols), Cart & Checkout on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Product Grid & Category Filters (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ease-in-out active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-900/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const inStock = product.totalStock > 0
              const cartItem = cart.find((i) => i.productId === product.id)
              const cartQty = cartItem ? cartItem.quantity : 0

              return (
                <button
                  key={product.id}
                  disabled={!inStock}
                  onClick={() => addToCart(product)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 ease-in-out relative group active:scale-95 ${
                    inStock
                      ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/50 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-900/10 hover:-translate-y-0.5 cursor-pointer'
                      : 'bg-slate-100/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/30 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {/* Cart count badge */}
                  {cartQty > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shadow-md shadow-purple-900/30">
                      {cartQty}
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-slate-400 font-semibold truncate max-w-[100px]">
                        {product.sku}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {product.category}
                      </span>
                    </div>

                    <h3 className="font-semibold text-xs tracking-tight text-slate-900 dark:text-white line-clamp-2 mt-1">
                      {product.name}
                    </h3>

                    {/* Expiry indicator */}
                    {showExpiry && product.isExpiringSoon && (
                      <span className="mt-1.5 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                        Expiring Soon
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-medium text-slate-400 block">Selling Price</span>
                      <span className="font-bold text-xs text-purple-500 font-mono">
                        {formatCurrency(product.suggestedSellingPrice || 0)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-medium text-slate-400 block">Stock</span>
                      <span
                        className={`text-xs font-bold font-mono ${
                          product.totalStock <= product.reorderLevel
                            ? 'text-amber-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {product.totalStock} {product.unit || 'pcs'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right Column: Active Cart Drawer & Checkout Panel (5 cols) */}
        <div className="lg:col-span-5">
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 shadow-lg shadow-purple-900/10 overflow-hidden flex flex-col h-full">
            {/* Cart Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-purple-500" />
                <h2 className="font-semibold tracking-tight text-sm text-slate-900 dark:text-white">
                  Current Sale Cart
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                  {cart.length} item{cart.length === 1 ? '' : 's'}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-400 transition-all duration-200 ease-in-out active:scale-95"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[320px]">
              {cart.length > 0 ? (
                cart.map((item) => {
                  const effectivePrice =
                    item.customPrice !== undefined ? item.customPrice : item.unitPrice
                  const priceVariance =
                    item.customPrice !== undefined ? item.customPrice - item.unitPrice : 0
                  const isEditingPrice = editingPriceProductId === item.productId

                  return (
                    <div
                      key={item.productId}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/60 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-purple-400 font-semibold">
                              {item.sku}
                            </span>
                            {/* Dynamic Price Override Badge */}
                            {priceVariance !== 0 && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 ${
                                  priceVariance < 0
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {priceVariance > 0 ? '+' : ''}
                                {formatCurrency(priceVariance)}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-semibold tracking-tight text-slate-900 dark:text-white truncate mt-0.5">
                            {item.productName}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <span>{formatCurrency(effectivePrice)} each</span>
                            {item.customPrice !== undefined && (
                              <span className="line-through text-[10px] opacity-60">
                                ({formatCurrency(item.unitPrice)})
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                isEditingPrice
                                  ? setEditingPriceProductId(null)
                                  : startEditingPrice(item)
                              }
                              className="text-purple-500 hover:text-purple-400 ml-1 p-0.5 rounded transition-colors active:scale-95"
                              title="Negotiate / Override Unit Price"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {item.customPrice !== undefined && (
                              <button
                                type="button"
                                onClick={() => resetCustomPrice(item.productId)}
                                className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors active:scale-95"
                                title="Reset to standard catalog price"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-purple-600 hover:text-white transition-all duration-200 ease-in-out active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/50"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-bold text-xs font-mono text-slate-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.maxAvailable}
                            className="p-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-purple-600 hover:text-white transition-all duration-200 ease-in-out active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700/50 disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-400 transition-all duration-200 ease-in-out active:scale-95 ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Item Total */}
                        <div className="text-right min-w-[70px]">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block font-mono">
                            {formatCurrency(item.quantity * effectivePrice)}
                          </span>
                        </div>
                      </div>

                      {/* Inline Dynamic Pricing Popover / Drawer */}
                      {isEditingPrice && (
                        <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2 animate-fade-in">
                          <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
                            <span>Negotiated Unit Price</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Catalog: {formatCurrency(item.unitPrice)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-medium text-slate-400 block mb-1">
                                Unit Price (₦)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={tempCustomPrice}
                                onChange={(e) => setTempCustomPrice(e.target.value)}
                                className="w-full px-2.5 py-1 bg-slate-900 border border-purple-500/40 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-slate-400 block mb-1">
                                Negotiation Note
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Bulk discount"
                                value={tempVarianceNote}
                                onChange={(e) => setTempVarianceNote(e.target.value)}
                                className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700/50 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingPriceProductId(null)}
                              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveCustomPrice(item.productId)}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-md shadow-purple-900/20 active:scale-95 transition-all duration-200 ease-in-out"
                            >
                              <Check className="w-3 h-3" />
                              Apply Price
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400 text-center">
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs font-semibold">Cart is currently empty</p>
                  <p className="text-xs mt-0.5 max-w-[200px] text-slate-400 leading-relaxed">
                    {isNoExpiry
                      ? 'Select items from the catalog to begin a transaction'
                      : 'Select items from the catalog or scan barcode to begin a transaction'}
                  </p>
                </div>
              )}
            </div>

            {/* Financial Adjustments (Discounts & Taxes) */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/30 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <Percent className="w-3.5 h-3.5 text-purple-500" />
                  Order Discount
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="flex rounded-lg border border-slate-200 dark:border-slate-700/50 p-0.5 text-xs">
                    <button
                      onClick={() => setDiscountType('flat')}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all duration-200 ease-in-out active:scale-95 ${
                        discountType === 'flat' ? 'bg-purple-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      ₦
                    </button>
                    <button
                      onClick={() => setDiscountType('percent')}
                      className={`px-2 py-0.5 rounded-md font-bold transition-all duration-200 ease-in-out active:scale-95 ${
                        discountType === 'percent' ? 'bg-purple-600 text-white' : 'text-slate-400'
                      }`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-18 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-right text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 font-medium">
                  <input
                    type="checkbox"
                    checked={includeTax}
                    onChange={(e) => setIncludeTax(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Include VAT / Tax ({taxRate}%)</span>
                </label>
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                  +{formatCurrency(taxAmount)}
                </span>
              </div>
            </div>

            {/* Bill Totals Summary */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-700/50">
                <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                  Grand Total
                </span>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent font-mono">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 space-y-2.5">
              <span className="text-xs font-semibold tracking-tight text-slate-400 block">
                Select Payment Method
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: DollarSign },
                  { id: 'transfer', label: 'Bank Transfer', icon: Building },
                  { id: 'card', label: 'POS / Card', icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon
                  const isSelected = paymentMethod === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 ease-in-out active:scale-95 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500/10 text-purple-400 shadow-sm shadow-purple-900/10'
                          : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      {m.label}
                    </button>
                  )
                })}
              </div>

              {/* Cash Tendered Calculator with Nigerian Naira Denominations */}
              {paymentMethod === 'cash' && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/50 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600 dark:text-slate-400">
                      Amount Tendered (₦)
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder="0.00"
                      className="w-28 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 text-right font-bold text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Quick cash shortcut pills */}
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleSetQuickCash(grandTotal)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-600 hover:text-white transition-all duration-200 ease-in-out active:scale-95"
                    >
                      Exact ({formatCurrency(grandTotal, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                    </button>
                    {grandTotal > 0 && (
                      <button
                        onClick={() => handleSetQuickCash(Math.ceil(grandTotal / 1000) * 1000)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-600 hover:text-white transition-all duration-200 ease-in-out active:scale-95 font-mono"
                      >
                        ₦{(Math.ceil(grandTotal / 1000) * 1000).toLocaleString('en-NG')}
                      </button>
                    )}
                    {grandTotal > 1000 && (
                      <button
                        onClick={() => handleSetQuickCash(Math.ceil(grandTotal / 5000) * 5000)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-600 hover:text-white transition-all duration-200 ease-in-out active:scale-95 font-mono"
                      >
                        ₦{(Math.ceil(grandTotal / 5000) * 5000).toLocaleString('en-NG')}
                      </button>
                    )}
                  </div>

                  {/* Live Change Amount */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/50 text-xs">
                    <span className="font-semibold text-slate-400">Change Due:</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">
                      {formatCurrency(cashChange)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Error banner */}
            {checkoutError && (
              <div className="p-3 bg-red-500/10 border-t border-red-500/20 flex items-center gap-1.5 text-xs font-semibold text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Complete Sale Action Button */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/40">
              <button
                disabled={cart.length === 0 || isProcessing}
                onClick={handleCheckout}
                className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-900/20 active:scale-95 transition-all duration-200 ease-in-out flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ? (
                  <span>Deducting FIFO Batches...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Sale ({formatCurrency(grandTotal)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Printable Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
        cashTendered={tenderedNum > 0 ? tenderedNum : undefined}
        cashChange={cashChange}
      />
    </div>
  )
}
