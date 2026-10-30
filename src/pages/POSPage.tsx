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
} from 'lucide-react'
import type { ProductWithStock, CartItem, PaymentMethod, SaleWithItems } from '@/db'
import { useProducts } from '@/hooks/useDatabase'
import { processSale, getSaleWithItems } from '@/db'
import { useAuth } from '@/context/AuthContext'
import { ReceiptModal } from '@/components/pos/ReceiptModal'

export function POSPage() {
  const products = useProducts()
  const { currentStaff } = useAuth()

  // State
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [cart, setCart] = useState<CartItem[]>([])

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

  // Auto-focus barcode / search on mount
  useEffect(() => {
    barcodeInputRef.current?.focus()
  }, [])

  // Unique categories
  const categories = useMemo(() => {
    if (!products) return ['All']
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['All', ...Array.from(set).sort()]
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
        const match =
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [products, selectedCategory, searchQuery])

  // Barcode enter key or exact scanner match
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = searchQuery.trim().toLowerCase()
      if (!q || !products) return

      // Look for exact barcode match first, then SKU
      const match =
        products.find((p) => p.barcode.toLowerCase() === q) ||
        products.find((p) => p.sku.toLowerCase() === q) ||
        products.find((p) => p.name.toLowerCase().includes(q))

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
            unitPrice: product.avgSellingPrice,
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

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId))
  }

  const clearCart = () => {
    setCart([])
    setDiscountValue('0')
    setCashTendered('')
    setCustomerName('')
    setNotes('')
    setCheckoutError(null)
  }

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
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
          <div className="p-2 rounded-xl bg-pika-100 dark:bg-pika-950/60 text-pika-700 dark:text-pika-300">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-surface-900 dark:text-white">
              Point of Sale
            </h1>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Offline-ready cashier register • Instant FIFO batch deduction
            </p>
          </div>
        </div>

        {/* Offline / Online Status Badge & Cashier info */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Local + Online' : '100% Offline Mode'}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs text-surface-500 dark:text-surface-400 font-medium">
            <span>Cashier:</span>
            <strong className="text-surface-900 dark:text-white">
              {currentStaff?.name || 'Staff'}
            </strong>
          </div>
        </div>
      </div>

      {/* Main POS Layout: 2 Columns (Catalog on Left, Active Cart on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Product Selection Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode Search Box */}
          <div className="relative">
            <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-pika-500" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Scan barcode or type name / SKU (Press Enter to add)..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all shadow-sm"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-pika-600 text-white shadow-sm'
                    : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.totalStock <= 0
              const cartItem = cart.find((i) => i.productId === product.id)
              const inCartQty = cartItem?.quantity || 0

              return (
                <button
                  key={product.id}
                  disabled={isOutOfStock}
                  onClick={() => addToCart(product)}
                  className={`group relative text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isOutOfStock
                      ? 'border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/30 opacity-50 cursor-not-allowed'
                      : inCartQty > 0
                      ? 'border-pika-500/80 bg-pika-50/30 dark:bg-pika-950/20 shadow-md shadow-pika-500/5'
                      : 'border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 hover:border-pika-400 hover:shadow-md'
                  }`}
                >
                  {/* In Cart Counter Badge */}
                  {inCartQty > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-pika-600 text-white text-xs font-bold flex items-center justify-center shadow-md animate-scale-in">
                      {inCartQty}
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between text-[10px] text-surface-400 mb-1">
                      <span className="font-mono uppercase">{product.sku}</span>
                      <span
                        className={`font-semibold ${
                          product.isLowStock
                            ? 'text-amber-500'
                            : isOutOfStock
                            ? 'text-red-500'
                            : 'text-surface-400'
                        }`}
                      >
                        {isOutOfStock ? '0 in stock' : `${product.totalStock} left`}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs text-surface-900 dark:text-white line-clamp-2 leading-tight">
                      {product.name}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2 border-t border-surface-100 dark:border-surface-800/60 flex items-center justify-between">
                    <span className="text-sm font-black text-pika-600 dark:text-pika-400">
                      ₦{product.avgSellingPrice.toFixed(2)}
                    </span>
                    <span className="p-1 rounded-lg bg-surface-100 dark:bg-surface-800 group-hover:bg-pika-600 group-hover:text-white text-surface-600 dark:text-surface-300 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
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
                <ShoppingCart className="w-4 h-4 text-pika-500" />
                <h2 className="font-bold text-sm text-surface-900 dark:text-white">
                  Current Sale Cart
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-pika-100 dark:bg-pika-950/60 text-pika-700 dark:text-pika-300 font-semibold">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px] max-h-[300px]">
              {cart.length > 0 ? (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-800/40 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-pika-600 dark:text-pika-400 font-semibold">
                          {item.sku}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-surface-900 dark:text-white truncate">
                        {item.productName}
                      </h4>
                      <span className="text-[11px] text-surface-500 dark:text-surface-400">
                        ₦{item.unitPrice.toFixed(2)} each
                      </span>
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
                      <span className="text-xs font-bold text-surface-900 dark:text-white block">
                        ₦{(item.quantity * item.unitPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 text-surface-400 text-center">
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs font-semibold">Cart is currently empty</p>
                  <p className="text-[11px] mt-0.5 max-w-[200px]">
                    Select items from the catalog or scan barcode to begin a transaction
                  </p>
                </div>
              )}
            </div>

            {/* Financial Adjustments (Discounts & Taxes) */}
            <div className="px-5 py-3 border-t border-surface-200 dark:border-surface-800 bg-surface-50/30 dark:bg-surface-800/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-surface-500 dark:text-surface-400 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-pika-500" />
                  Discount
                </span>
                <div className="flex items-center gap-1">
                  <div className="flex rounded-lg border border-surface-200 dark:border-surface-700 p-0.5 text-[10px]">
                    <button
                      onClick={() => setDiscountType('flat')}
                      className={`px-1.5 py-0.5 rounded ${
                        discountType === 'flat' ? 'bg-pika-600 text-white font-bold' : 'text-surface-400'
                      }`}
                    >
                      ₦
                    </button>
                    <button
                      onClick={() => setDiscountType('percent')}
                      className={`px-1.5 py-0.5 rounded ${
                        discountType === 'percent' ? 'bg-pika-600 text-white font-bold' : 'text-surface-400'
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
                    className="w-3.5 h-3.5 rounded text-pika-600 focus:ring-pika-500"
                  />
                  <span>Include VAT / Tax ({taxRate}%)</span>
                </label>
                <span className="font-semibold text-surface-700 dark:text-surface-300">
                  +₦{taxAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Bill Totals Summary */}
            <div className="px-5 py-3 border-t border-surface-200 dark:border-surface-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-surface-500 dark:text-surface-400">
                <span>Subtotal</span>
                <span>₦{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Discount</span>
                  <span>-₦{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-surface-200 dark:border-surface-800">
                <span className="text-sm font-bold text-surface-900 dark:text-white">
                  Grand Total
                </span>
                <span className="text-xl font-black bg-gradient-to-r from-pika-600 to-pika-500 bg-clip-text text-transparent">
                  ₦{grandTotal.toFixed(2)}
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
                          ? 'border-pika-500 bg-pika-50/60 dark:bg-pika-950/40 text-pika-600 dark:text-pika-300 shadow-sm'
                          : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-0.5" />
                      {m.label}
                    </button>
                  )
                })}
              </div>

              {/* Cash Tendered Calculator */}
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
                      className="w-24 px-2 py-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-right font-bold text-xs focus:outline-none"
                    />
                  </div>

                  {/* Quick cash shortcut pills */}
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => handleSetQuickCash(grandTotal)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200 hover:bg-pika-600 hover:text-white transition-colors"
                    >
                      Exact (₦{grandTotal.toFixed(0)})
                    </button>
                    <button
                      onClick={() => handleSetQuickCash(Math.ceil(grandTotal / 1000) * 1000)}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200 hover:bg-pika-600 hover:text-white transition-colors"
                    >
                      ₦{(Math.ceil(grandTotal / 1000) * 1000).toLocaleString()}
                    </button>
                  </div>

                  {/* Live Change Amount */}
                  <div className="flex items-center justify-between pt-1 border-t border-surface-200 dark:border-surface-700 text-xs">
                    <span className="font-semibold text-surface-500">Change Due:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₦{cashChange.toFixed(2)}
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
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pika-600 via-pika-700 to-pika-800 hover:from-pika-700 hover:to-pika-900 text-white font-bold text-sm shadow-xl shadow-pika-700/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <span>Deducting FIFO Batches...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Sale (₦{grandTotal.toFixed(2)})</span>
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
