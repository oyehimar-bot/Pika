/**
 * Pika Database — TypeScript Data Models
 *
 * Core entity types for the local-first inventory management system.
 * All entities use auto-incremented numeric IDs for IndexedDB performance.
 */

// ─── Product ────────────────────────────────────────────────────────────────

export interface Product {
  id?: number
  name: string
  sku: string
  category: string
  unit: string
  reorderLevel: number
  barcode: string
  imageUrl?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ─── Batch (Inventory Lot) ──────────────────────────────────────────────────

export interface Batch {
  id?: number
  productId: number
  batchNumber: string
  costPrice: number
  sellingPrice: number
  initialQty: number
  remainingQty: number
  expiryDate: Date | null
  receivedDate: Date
  supplier?: string
  notes?: string
  isActive: boolean
  createdAt: Date
}

// ─── Sale (Transaction Header) ──────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mobile' | 'split'

export interface Sale {
  id?: number
  transactionId: string
  totalAmount: number
  subtotal: number
  discount: number
  tax: number
  paymentMethod: PaymentMethod
  staffId: string
  staffName: string
  customerName?: string
  notes?: string
  timestamp: Date
}

// ─── Sale Item (Transaction Line) ───────────────────────────────────────────

export interface SaleItem {
  id?: number
  saleId: number
  productId: number
  productName: string
  batchId: number
  batchNumber: string
  quantity: number
  unitCostPrice: number
  unitSellingPrice: number
  listedPrice?: number
  actualSoldPrice?: number
  priceVariance?: number
  varianceNote?: string
  lineTotal: number
  lineProfit: number
}

// ─── Audit Log ──────────────────────────────────────────────────────────────

export type AuditAction =
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'batch_received'
  | 'batch_adjusted'
  | 'batch_expired'
  | 'sale_completed'
  | 'sale_voided'
  | 'discount_applied'
  | 'stock_adjustment'
  | 'staff_login'
  | 'staff_logout'
  | 'data_export'
  | 'settings_changed'

export type AuditEntity = 'product' | 'batch' | 'sale' | 'staff' | 'system'

export interface AuditLog {
  id?: number
  staffId: string
  staffName: string
  action: AuditAction
  entity: AuditEntity
  entityId?: number
  details: string
  metadata?: Record<string, unknown>
  timestamp: Date
}

// ─── Staff ──────────────────────────────────────────────────────────────────

export type StaffRole = 'admin' | 'manager' | 'cashier'

export interface Staff {
  id?: number
  name: string
  pin: string // 4-digit PIN (hashed in production)
  role: StaffRole
  isActive: boolean
  createdAt: Date
}

// ─── Derived / Computed Types ───────────────────────────────────────────────

/** Product with aggregated stock info from all active batches */
export interface ProductWithStock extends Product {
  totalStock: number
  totalValue: number
  avgCostPrice: number
  avgSellingPrice: number
  suggestedSellingPrice?: number
  activeBatchCount: number
  earliestExpiry: Date | null
  isLowStock: boolean
  isExpiringSoon: boolean
}

/** Batch with parent product name for display */
export interface BatchWithProduct extends Batch {
  productName: string
  productSku: string
}

/** Sale with all its line items */
export interface SaleWithItems extends Sale {
  items: SaleItem[]
  totalProfit: number
  totalCost: number
}

export type BusinessMode = 'no_expiry' | 'expiry_only' | 'hybrid'

export interface AppSetting {
  key: string
  value: unknown
}

/** Cart item used during POS checkout (before committing to DB) */
export interface CartItem {
  productId: number
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  customPrice?: number
  varianceNote?: string
  maxAvailable: number
  batches: BatchAllocation[]
}

/** FIFO allocation showing how many units come from each batch */
export interface BatchAllocation {
  batchId: number
  batchNumber: string
  quantity: number
  costPrice: number
  sellingPrice: number
}

// ─── FIFO Result Types ──────────────────────────────────────────────────────

export interface FIFODeductionResult {
  success: boolean
  allocations: BatchAllocation[]
  totalCost: number
  totalRevenue: number
  profit: number
  error?: string
}

export interface StockAdjustmentResult {
  success: boolean
  batchId: number
  previousQty: number
  newQty: number
  error?: string
}

export interface ExpiryWarning {
  batchId: number
  batchNumber: string
  productId: number
  productName: string
  expiryDate: Date
  remainingQty: number
  daysUntilExpiry: number
}

