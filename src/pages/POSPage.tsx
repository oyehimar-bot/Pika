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
  Smartphone,
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
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')

  // Checkout submission & Receipt
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [completedSale, setCompletedSale] = useState<SaleWithItems | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)

  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Mode-specific color themes and UI accents
  const modeColors = useMemo(() => {
    if (isNoExpiry) {
      return {
        badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
        badgeText: 'Non-Expiry Mode',
        tabActive: 'bg-sky-600 text-white shadow-md shadow-sky-600/30',
        cardBorder: 'hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-lg',
        cartQtyBadge: 'bg-sky-600 text-white',
        priceText: 'text-sky-600 dark:text-sky-400',
        ring: 'focus:ring-sky-500',
        checkoutBtn: 'from-sky-700 via-blue-600 to-slate-900 hover:from-sky-800 hover:to-blue-700 shadow-sky-700/25',
        accentText: 'text-sky-600 dark:text-sky-400',
        tagBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      }
    } else if (businessMode === 'expiry_only') {
      return {
        badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        badgeText: 'Strict Expiry Mode',
        tabActive: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30',
        cardBorder: 'hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg',
        cartQtyBadge: 'bg-emerald-600 text-white',
        priceText: 'text-emerald-600 dark:text-emerald-400',
        ring: 'focus:ring-emerald-500',
        checkoutBtn: 'from-emerald-700 via-teal-600 to-slate-900 hover:from-emerald-800 hover:to-teal-700 shadow-emerald-700/25',
        accentText: 'text-emerald-600 dark:text-emerald-400',
        tagBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      }
    } else {
      return {
        badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
        badgeText: 'Hybrid Store',
        tabActive: 'bg-purple-600 text-white shadow-md shadow-purple-600/30',
        cardBorder: 'hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-lg',
        cartQtyBadge: 'bg-purple-600 text-white',
        priceText: 'text-purple-600 dark:text-purple-400',
        ring: 'focus:ring-purple-500',
        checkoutBtn: 'from-purple-700 via-purple-600 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 shadow-purple-700/25',
        accentText: 'text-purple-600 dark:text-purple-400',
        tagBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      }
    }
  }, [businessMode, isNoExpiry])

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
      const q = searchQuery.trim().toLowerCase()
      if (!q || !products) return

      let match: ProductWithStock | undefined
      if (isNoExpiry) {
        // In non-expiry mode, do NOT search or match by barcode
        match =
          products.find((p) => p.sku.toLowerCase() === q) ||
          products.find((p) => p.name.toLowerCase().includes(q))
      } else {
        // Look for exact barcode match first, then SKU, then name
        match =
          products.find((p) => p.barcode && p.barcode.toLowerCase() === q) ||
          products.find((p) => p.sku.toLowerCase() === q) ||
          products.find((p) => p.name.toLowerCase().includes(q))
      }

      if (match) {
        addToCart(match)
        setSearchQuery('')
      }
    }
  }

  // Cart Management
  const addToCart = (product: ProductWithStock) => {
    if (product.totalStock <= 0) return

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id)
      if (existing) {
        // Enforce maximum available inventory constraint
        if (existing.quantity >= product.totalStock) {
          return prev
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [
          ...prev,
          {
            productId: product.id!,
            productName: product.name,
            sku: product.sku,
            quantity: 1,
            unitPrice: product.suggestedSellingPrice || 0,
            maxAvailable: product.totalStock,
            batches: [],
          },
        ]
      }
    })
  }

  const updateQuantity = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId)
      return
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const clamped = Math.min(newQty, item.maxAvailable)
          return { ...item, quantity: clamped }
        }
        return item
      })
    )
  }

  // Dynamic pricing actions
  const startEditingPrice = (item: CartItem) => {
    setEditingPriceProductId(item.productId)
    setTempCustomPrice(
      item.customPrice !== undefined ? String(item.customPrice) : String(item.unitPrice)
    )
    setTempVarianceNote(item.varianceNote || '')
  }

  const saveCustomPrice = (productId: number) => {
    const parsed = parseFloat(tempCustomPrice)
    if (!isNaN(parsed) && parsed >= 0) {
      setCart((prev) =>
        prev.map((item) => {
          if (item.productId === productId) {
            return {
              ...item,
              customPrice: parsed,
              varianceNote: tempVarianceNote.trim() || undefined,
            }
          }
          return item
        })
      )
    }
    setEditingPriceProductId(null)
  }

  const resetCustomPrice = (productId: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          return {
            ...item,
            customPrice: undefined,
            varianceNote: undefined,
          }
        }
        return item
      })
    )
    if (editingPriceProductId === productId) {
      setEditingPriceProductId(null)
    }
  }

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
    if (editingPriceProductId === productId) {
      setEditingPriceProductId(null)
    }
  }

  const clearCart = () => {
    setCart([])
    setDiscountValue('0')
    setCashTendered('')
    setCustomerName('')
    setNotes('')
    setCheckoutError(null)
    setEditingPriceProductId(null)
  }

  // Calculations taking dynamic price into account
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const effectivePrice = item.customPrice !== undefined ? item.customPrice : item.unitPrice
      return sum + item.quantity * effectivePrice
    }, 0)
  }, [cart])

  const discountAmount = useMemo(() => {
    const val = parseFloat(discountValue) || 0
    if (discountType === 'percent') {
      return (subtotal * Math.min(100, Math.max(0, val))) / 100
    }
    return Math.min(subtotal, Math.max(0, val))
  }, [subtotal, discountType, discountValue])

  const taxableAmount = Math.max(0, subtotal - discountAmount)
  const taxAmount = includeTax ? (taxableAmount * taxRate) / 100 : 0
  const grandTotal = Math.max(0, taxableAmount + taxAmount)

  // Cash change calculations
  const tenderedNum = parseFloat(cashTendered) || 0
  const cashChange = paymentMethod === 'cash' ? Math.max(0, tenderedNum - grandTotal) : 0

  // Quick tender helpers
  const handleSetQuickCash = (amount: number) => {
    setCashTendered(amount.toFixed(2))
  }

  // Submit Sale
  const handleCheckout = async () => {
    if (cart.length === 0) return
    setCheckoutError(null)

    if (paymentMethod === 'cash' && tenderedNum > 0 && tenderedNum < grandTotal) {
      setCheckoutError('Cash tendered is less than the total bill.')
      return
    }

    try {
      setIsProcessing(true)

      const result = await processSale({
        cartItems: cart,
        paymentMethod,
        discount: Math.round(discountAmount * 100) / 100,
        tax: Math.round(taxAmount * 100) / 100,
        staffId: currentStaff ? String(currentStaff.id) : 'cashier',
        staffName: currentStaff ? currentStaff.name : 'Cashier',
        customerName: customerName.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      if (!result.success || !result.saleId) {
        throw new Error(result.error || 'Sale processing failed')
      }

      // Fetch full sale with items to display in receipt
      const saleDetails = await getSaleWithItems(result.saleId)
      setCompletedSale(saleDetails)
      setIsReceiptOpen(true)

      // Clear cart
      clearCart()
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Banner: Status & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-white">
              Point of Sale Checkout
            </h1>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Offline-ready checkout engine with strict FIFO lot depletion & dynamic pricing
            </p>
          </div>
        </div>

        {/* Offline Badge, Mode Badge & Search/Barcode input */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Mode Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${modeColors.badge}`}
          >
            <span>{modeColors.badgeText}</span>
          </div>

          {/* Online/Offline status */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40'
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
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            ) : (
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            )}
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder={isNoExpiry ? 'Search product name or SKU...' : 'Scan Barcode or Search SKU...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-xs text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 ${modeColors.ring}`}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Products on Left (7 cols), Cart & Checkout on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Product Grid & Category Filters (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? modeColors.tabActive
                    : 'bg-white dark:bg-surface-800/80 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const inStock = product.totalStock > 0
              const cartItem = cart.find((i) => i.productId === product.id)
              const cartQty = cartItem ? cartItem.quantity : 0

              return (
                <button
                  key={product.id}
                  disabled={!inStock}
                  onClick={() => addToCart(product)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 relative group ${
                    inStock
                      ? `bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800 ${modeColors.cardBorder}`
                      : 'bg-surface-100/50 dark:bg-surface-900/30 border-surface-200 dark:border-surface-800/50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {/* Cart count badge */}
                  {cartQty > 0 && (
                    <span className={`absolute top-2 right-2 w-5 h-5 rounded-full ${modeColors.cartQtyBadge} text-[10px] font-bold flex items-center justify-center shadow-md`}>
                      {cartQty}
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] text-surface-400 font-semibold truncate max-w-[100px]">
                        {product.sku}
                      </span>
                      <span className="text-[10px] font-medium text-surface-400 uppercase">
                        {product.category}
                      </span>
                    </div>

                    <h3 className="font-bold text-xs text-surface-900 dark:text-white line-clamp-2">
                      {product.name}
                    </h3>

                    {/* Expiry / Perishable indicator if in expiry or hybrid mode */}
                    {showExpiry && product.isExpiringSoon && (
                      <span className="mt-1 inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        Expiring Soon
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-surface-100 dark:border-surface-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-surface-400 block">Selling Price</span>
                      <span className={`font-black text-xs ${modeColors.priceText}`}>
                        {formatCurrency(product.suggestedSellingPrice || 0)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-surface-400 block">Stock</span>
                      <span
                        className={`text-xs font-bold ${
                          product.totalStock <= product.reorderLevel
                            ? 'text-amber-500'
                            : 'text-surface-700 dark:text-surface-300'
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

        {/* Right Column: Active Cart & Checkout Panel (5 cols) */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-xl overflow-hidden flex flex-col h-full">
            {/* Cart Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/30">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-purple-500" />
                <h2 className="font-bold text-sm text-surface-900 dark:text-white">
                  Current Sale Cart
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                  {cart.length} item{cart.length === 1 ? '' : 's'}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="flex items-center gap-1 text-[11px] font-semibold text-surface-400 hover:text-red-500 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px] max-h-[320px]">
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
                      className="p-3 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-800/40 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                              {item.sku}
                            </span>
                            {/* Dynamic Price Override Badge */}
                            {priceVariance !== 0 && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5 ${
                                  priceVariance < 0
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                }`}
                              >
                                <Tag className="w-2.5 h-2.5" />
                                {priceVariance > 0 ? '+' : ''}
                                {formatCurrency(priceVariance)}
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-surface-900 dark:text-white truncate">
                            {item.productName}
                          </h4>
                          <div className="flex items-center gap-1 text-[11px] text-surface-500 dark:text-surface-400">
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
                              className="text-purple-500 hover:text-purple-400 ml-1 p-0.5 rounded"
                              title="Negotiate / Override Unit Price"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {item.customPrice !== undefined && (
                              <button
                                type="button"
                                onClick={() => resetCustomPrice(item.productId)}
                                className="text-surface-400 hover:text-surface-200 p-0.5 rounded"
                                title="Reset to standard catalog price"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="p-1 rounded-lg bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-100 shadow-sm"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-bold text-xs text-surface-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.maxAvailable}
                            className="p-1 rounded-lg bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-100 shadow-sm disabled:opacity-40"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="p-1 rounded-lg text-surface-400 hover:text-red-500 transition-colors ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Item Total */}
                        <div className="text-right min-w-[70px]">
                          <span className="text-xs font-bold text-surface-900 dark:text-white block font-mono">
                            {formatCurrency(item.quantity * effectivePrice)}
                          </span>
                        </div>
                      </div>

                      {/* Inline Dynamic Pricing Popover / Drawer */}
                      {isEditingPrice && (
                        <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2 animate-in fade-in">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-purple-300">
                            <span>Negotiated Unit Price</span>
                            <span className="text-[10px] text-surface-400">
                              Catalog: {formatCurrency(item.unitPrice)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-surface-400 block mb-0.5">
                                Unit Price (₦)
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={tempCustomPrice}
                                onChange={(e) => setTempCustomPrice(e.target.value)}
                                className="w-full px-2 py-1 bg-surface-900 border border-purple-500/40 rounded text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-surface-400 block mb-0.5">
                                Negotiation Note
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Bulk discount"
                                value={tempVarianceNote}
                                onChange={(e) => setTempVarianceNote(e.target.value)}
                                className="w-full px-2 py-1 bg-surface-900 border border-surface-700 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingPriceProductId(null)}
                              className="px-2 py-1 text-[11px] text-surface-400 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => saveCustomPrice(item.productId)}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm"
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
                <div className="flex flex-col items-center justify-center h-full py-10 text-surface-400 text-center">
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs font-semibold">Cart is currently empty</p>
                  <p className="text-[11px] mt-0.5 max-w-[200px]">
                    {isNoExpiry
                      ? 'Select items from the catalog to begin a transaction'
                      : 'Select items from the catalog or scan barcode to begin a transaction'}
                  </p>
                </div>
              )}
            </div>

            {/* Financial Adjustments (Discounts & Taxes) */}
            <div className="px-5 py-3 border-t border-surface-200 dark:border-surface-800 bg-surface-50/30 dark:bg-surface-800/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-500 dark:text-surface-400 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-purple-500" />
                  Order Discount
                </span>
                <div className="flex items-center gap-1">
                  <div className="flex rounded-lg border border-surface-200 dark:border-surface-700 p-0.5 text-[10px]">
                    <button
                      onClick={() => setDiscountType('flat')}
                      className={`px-1.5 py-0.5 rounded ${
                        discountType === 'flat' ? 'bg-purple-600 text-white font-bold' : 'text-surface-400'
                      }`}
                    >
                      ₦
                    </button>
                    <button
                      onClick={() => setDiscountType('percent')}
                      className={`px-1.5 py-0.5 rounded ${
                        discountType === 'percent' ? 'bg-purple-600 text-white font-bold' : 'text-surface-400'
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
                    className="w-16 px-2 py-0.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-right text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-surface-500 dark:text-surface-400">
                  <input
                    type="checkbox"
                    checked={includeTax}
                    onChange={(e) => setIncludeTax(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span>Include VAT / Tax ({taxRate}%)</span>
                </label>
                <span className="font-semibold text-surface-700 dark:text-surface-300 font-mono">
                  +{formatCurrency(taxAmount)}
                </span>
              </div>
            </div>

            {/* Bill Totals Summary */}
            <div className="px-5 py-3 border-t border-surface-200 dark:border-surface-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-surface-500 dark:text-surface-400">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-surface-200 dark:border-surface-800">
                <span className="text-sm font-bold text-surface-900 dark:text-white">
                  Grand Total
                </span>
                <span className="text-xl font-black bg-gradient-to-r from-purple-500 to-indigo-400 bg-clip-text text-transparent font-mono">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="px-5 py-3 border-t border-surface-200 dark:border-surface-800 space-y-2">
              <span className="text-[11px] font-semibold text-surface-500 dark:text-surface-400 block">
                Select Payment Method
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'cash', label: 'Cash', icon: DollarSign },
                  { id: 'card', label: 'Card/POS', icon: CreditCard },
                  { id: 'transfer', label: 'Transfer', icon: Building },
                  { id: 'mobile', label: 'Mobile', icon: Smartphone },
                ].map((m) => {
                  const Icon = m.icon
                  const isSelected = paymentMethod === m.id
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-semibold transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 shadow-sm'
                          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-0.5" />
                      {m.label}
                    </button>
                  )
                })}
              </div>

              {/* Cash Tendered Calculator with Nigerian Naira Denominations */}
              {paymentMethod === 'cash' && (
                <div className="p-3 rounded-xl bg-surface-50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-surface-600 dark:text-surface-300">
                      Amount Tendered (₦)
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      placeholder="0.00"
                      className="w-28 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-right font-bold text-xs focus:outline-none font-mono"
                    />
                  </div>

                  {/* Quick cash shortcut pills */}
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleSetQuickCash(grandTotal)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200 hover:bg-purple-600 hover:text-white transition-colors"
                    >
                      Exact ({formatCurrency(grandTotal, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
                    </button>
                    {grandTotal > 0 && (
                      <button
                        onClick={() => handleSetQuickCash(Math.ceil(grandTotal / 1000) * 1000)}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200 hover:bg-purple-600 hover:text-white transition-colors font-mono"
                      >
                        ₦{(Math.ceil(grandTotal / 1000) * 1000).toLocaleString('en-NG')}
                      </button>
                    )}
                    {grandTotal > 1000 && (
                      <button
                        onClick={() => handleSetQuickCash(Math.ceil(grandTotal / 5000) * 5000)}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200 hover:bg-purple-600 hover:text-white transition-colors font-mono"
                      >
                        ₦{(Math.ceil(grandTotal / 5000) * 5000).toLocaleString('en-NG')}
                      </button>
                    )}
                  </div>

                  {/* Live Change Amount */}
                  <div className="flex items-center justify-between pt-1 border-t border-surface-200 dark:border-surface-700 text-xs">
                    <span className="font-semibold text-surface-500">Change Due:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(cashChange)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Error banner */}
            {checkoutError && (
              <div className="px-5 py-2 bg-red-50 dark:bg-red-950/40 border-t border-red-200 dark:border-red-900/50 flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Complete Sale Action Button */}
            <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-800/40">
              <button
                disabled={cart.length === 0 || isProcessing}
                onClick={handleCheckout}
                className={`w-full py-3.5 rounded-2xl bg-gradient-to-r ${modeColors.checkoutBtn} text-white font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed`}
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
