import { db } from './database'
import type {
  Batch,
  BatchAllocation,
  FIFODeductionResult,
  StockAdjustmentResult,
  ExpiryWarning,
  ProductWithStock,
} from './models'

/**
 * FIFO Inventory Valuation Engine
 *
 * Implements First-In, First-Out costing for inventory management:
 * - Stock is always deducted from the OLDEST active batch first
 * - Each sale item records the exact batch(es) and cost price consumed
 * - Profit/Loss is computed from actual unit costs, not averages
 *
 * This gives SMEs accurate COGS (Cost of Goods Sold) reporting and
 * ensures oldest stock is sold first, critical for perishable goods.
 */

// ─── FIFO Deduction ─────────────────────────────────────────────────────────

/**
 * Allocate `quantity` units from a product's active batches using FIFO.
 *
 * Returns the batch allocations (which batches to deduct from and how many)
 * WITHOUT modifying the database. Call `commitFIFODeduction` to persist.
 *
 * @param productId - The product to deduct stock from
 * @param quantity  - Number of units to deduct
 * @returns FIFODeductionResult with allocations and cost/revenue breakdown
 */
export async function calculateFIFOAllocation(
  productId: number,
  quantity: number
): Promise<FIFODeductionResult> {
  if (quantity <= 0) {
    return {
      success: false,
      allocations: [],
      totalCost: 0,
      totalRevenue: 0,
      profit: 0,
      error: 'Quantity must be greater than zero',
    }
  }

  // Fetch active batches ordered by receivedDate (oldest first = FIFO)
  const productBatches = await db.batches
    .where('productId')
    .equals(productId)
    .toArray()

  const activeBatches = productBatches
    .filter((b) => b.isActive && b.remainingQty > 0)
    .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime())

  if (activeBatches.length === 0) {
    return {
      success: false,
      allocations: [],
      totalCost: 0,
      totalRevenue: 0,
      profit: 0,
      error: 'No active batches with available stock',
    }
  }

  // Calculate total available stock
  const totalAvailable = activeBatches.reduce((sum, b) => sum + b.remainingQty, 0)

  if (totalAvailable < quantity) {
    return {
      success: false,
      allocations: [],
      totalCost: 0,
      totalRevenue: 0,
      profit: 0,
      error: `Insufficient stock: requested ${quantity}, available ${totalAvailable}`,
    }
  }

  // FIFO allocation: consume from oldest batch first
  const allocations: BatchAllocation[] = []
  let remaining = quantity

  for (const batch of activeBatches) {
    if (remaining <= 0) break

    const deductQty = Math.min(remaining, batch.remainingQty)

    allocations.push({
      batchId: batch.id!,
      batchNumber: batch.batchNumber,
      quantity: deductQty,
      costPrice: batch.costPrice,
      sellingPrice: batch.sellingPrice,
    })

    remaining -= deductQty
  }

  // Calculate totals from actual batch costs
  const totalCost = allocations.reduce(
    (sum, a) => sum + a.quantity * a.costPrice,
    0
  )
  const totalRevenue = allocations.reduce(
    (sum, a) => sum + a.quantity * a.sellingPrice,
    0
  )

  return {
    success: true,
    allocations,
    totalCost: roundCurrency(totalCost),
    totalRevenue: roundCurrency(totalRevenue),
    profit: roundCurrency(totalRevenue - totalCost),
  }
}

/**
 * Commit FIFO deductions to the database by updating batch quantities.
 * Should be called inside a transaction together with sale creation.
 *
 * @param allocations - The batch allocations to commit
 */
export async function commitFIFODeduction(
  allocations: BatchAllocation[]
): Promise<void> {
  await db.transaction('rw', db.batches, async () => {
    for (const alloc of allocations) {
      const batch = await db.batches.get(alloc.batchId)
      if (!batch) {
        throw new Error(`Batch ${alloc.batchId} not found during deduction commit`)
      }

      const newQty = batch.remainingQty - alloc.quantity
      if (newQty < 0) {
        throw new Error(
          `Batch ${batch.batchNumber}: attempted to deduct ${alloc.quantity} ` +
          `but only ${batch.remainingQty} remaining`
        )
      }

      await db.batches.update(alloc.batchId, {
        remainingQty: newQty,
        // Auto-deactivate batch when fully consumed
        isActive: newQty > 0,
      })
    }
  })
}

// ─── Stock Management ───────────────────────────────────────────────────────

/**
 * Add a new batch of stock for a product.
 *
 * @param batch - Batch data (without id, createdAt, isActive)
 * @returns The created batch ID
 */
export async function addBatch(
  batch: Omit<Batch, 'id' | 'createdAt' | 'isActive'>
): Promise<number> {
  const batchId = await db.batches.add({
    ...batch,
    isActive: true,
    createdAt: new Date(),
  }) as number

  await db.auditLogs.add({
    staffId: 'system',
    staffName: 'System',
    action: 'batch_received',
    entity: 'batch',
    entityId: batchId,
    details: `Batch ${batch.batchNumber} received: ${batch.initialQty} units @ ₦${batch.costPrice} cost`,
    metadata: {
      productId: batch.productId,
      batchNumber: batch.batchNumber,
      quantity: batch.initialQty,
      costPrice: batch.costPrice,
      sellingPrice: batch.sellingPrice,
    },
    timestamp: new Date(),
  })

  return batchId
}

/**
 * Manually adjust the remaining quantity of a specific batch.
 * Used for stock corrections, damage write-offs, etc.
 *
 * @param batchId  - The batch to adjust
 * @param newQty   - The corrected quantity
 * @param reason   - Reason for the adjustment
 * @param staffId  - Who performed the adjustment
 * @param staffName - Staff display name
 */
export async function adjustBatchStock(
  batchId: number,
  newQty: number,
  reason: string,
  staffId: string,
  staffName: string
): Promise<StockAdjustmentResult> {
  const batch = await db.batches.get(batchId)
  if (!batch) {
    return {
      success: false,
      batchId,
      previousQty: 0,
      newQty: 0,
      error: 'Batch not found',
    }
  }

  if (newQty < 0) {
    return {
      success: false,
      batchId,
      previousQty: batch.remainingQty,
      newQty: batch.remainingQty,
      error: 'Quantity cannot be negative',
    }
  }

  const previousQty = batch.remainingQty

  await db.transaction('rw', [db.batches, db.products, db.auditLogs], async () => {
    await db.batches.update(batchId, {
      remainingQty: newQty,
      isActive: newQty > 0,
    })

    await db.auditLogs.add({
      staffId,
      staffName,
      action: 'stock_adjustment',
      entity: 'batch',
      entityId: batchId,
      details: `Batch ${batch.batchNumber} adjusted: ${previousQty} → ${newQty} units. Reason: ${reason}`,
      metadata: {
        productId: batch.productId,
        batchNumber: batch.batchNumber,
        previousQty,
        newQty,
        reason,
      },
      timestamp: new Date(),
    })
  })

  return {
    success: true,
    batchId,
    previousQty,
    newQty,
  }
}

// ─── Expiry Tracking ────────────────────────────────────────────────────────

/**
 * Get all batches expiring within the specified number of days.
 *
 * @param daysAhead - Number of days to look ahead (default: 30)
 * @returns Array of expiry warnings sorted by urgency
 */
export async function getExpiringBatches(
  daysAhead: number = 30
): Promise<ExpiryWarning[]> {
  const now = new Date()
  const cutoffDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const activeBatches = await db.batches
    .filter((b) => {
      if (!b.isActive || b.remainingQty <= 0 || !b.expiryDate) return false
      const expiry = new Date(b.expiryDate).getTime()
      return expiry <= cutoffDate.getTime()
    })
    .toArray()

  activeBatches.sort(
    (a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime()
  )

  const warnings: ExpiryWarning[] = []

  for (const batch of activeBatches) {
    if (!batch.expiryDate) continue

    const product = await db.products.get(batch.productId)
    const daysUntilExpiry = Math.ceil(
      (new Date(batch.expiryDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    )

    warnings.push({
      batchId: batch.id!,
      batchNumber: batch.batchNumber,
      productId: batch.productId,
      productName: product?.name ?? 'Unknown Product',
      expiryDate: new Date(batch.expiryDate),
      remainingQty: batch.remainingQty,
      daysUntilExpiry,
    })
  }

  return warnings
}

/**
 * Auto-flag batches that have already expired by deactivating them
 * and logging the event. Intended to run on app startup or periodically.
 *
 * @returns Number of batches flagged as expired
 */
export async function flagExpiredBatches(): Promise<number> {
  const now = new Date()
  let flaggedCount = 0

  const expiredBatches = await db.batches
    .filter(
      (b) =>
        b.isActive &&
        b.expiryDate !== null &&
        new Date(b.expiryDate).getTime() < now.getTime()
    )
    .toArray()

  if (expiredBatches.length === 0) return 0

  await db.transaction('rw', [db.batches, db.products, db.auditLogs], async () => {
    for (const batch of expiredBatches) {
      await db.batches.update(batch.id!, {
        isActive: false,
      })

      const product = await db.products.get(batch.productId)

      await db.auditLogs.add({
        staffId: 'system',
        staffName: 'System',
        action: 'batch_expired',
        entity: 'batch',
        entityId: batch.id,
        details: `Batch ${batch.batchNumber} of "${product?.name ?? 'Unknown'}" expired. ` +
          `${batch.remainingQty} units written off.`,
        metadata: {
          productId: batch.productId,
          batchNumber: batch.batchNumber,
          remainingQty: batch.remainingQty,
          expiryDate: batch.expiryDate,
        },
        timestamp: new Date(),
      })

      flaggedCount++
    }
  })

  return flaggedCount
}

// ─── Product Stock Aggregation ──────────────────────────────────────────────

/**
 * Get a product with aggregated stock information from all its active batches.
 *
 * @param productId - The product ID
 * @param expiryWarningDays - Days threshold for "expiring soon" flag (default: 14)
 * @returns ProductWithStock or null if product doesn't exist
 */
export async function getProductWithStock(
  productId: number,
  expiryWarningDays: number = 14
): Promise<ProductWithStock | null> {
  const product = await db.products.get(productId)
  if (!product) return null

  const batches = await db.batches
    .where('productId')
    .equals(productId)
    .toArray()

  const activeBatches = batches.filter((b) => b.isActive && b.remainingQty > 0)

  return computeProductStock(product, activeBatches, expiryWarningDays)
}

/**
 * Get all products with their aggregated stock information.
 *
 * @param expiryWarningDays - Days threshold for "expiring soon" flag
 * @returns Array of ProductWithStock
 */
export async function getAllProductsWithStock(
  expiryWarningDays: number = 14
): Promise<ProductWithStock[]> {
  const products = await db.products
    .filter((p) => p.isActive)
    .toArray()

  const allBatches = await db.batches
    .filter((b) => b.isActive && b.remainingQty > 0)
    .toArray()

  const batchesByProduct = new Map<number, Batch[]>()
  for (const batch of allBatches) {
    const list = batchesByProduct.get(batch.productId) || []
    list.push(batch)
    batchesByProduct.set(batch.productId, list)
  }

  const results: ProductWithStock[] = []

  for (const product of products) {
    const activeBatches = batchesByProduct.get(product.id!) || []
    results.push(
      computeProductStock(product, activeBatches, expiryWarningDays)
    )
  }

  return results
}

/**
 * Compute aggregated stock metrics for a product from its batches.
 */
function computeProductStock(
  product: Product,
  activeBatches: Batch[],
  expiryWarningDays: number
): ProductWithStock {
  const now = new Date()
  const warningCutoff = new Date(
    now.getTime() + expiryWarningDays * 24 * 60 * 60 * 1000
  )

  const totalStock = activeBatches.reduce((sum, b) => sum + b.remainingQty, 0)

  // Inventory value = sum of (remaining qty × cost price) per batch
  const totalValue = activeBatches.reduce(
    (sum, b) => sum + b.remainingQty * b.costPrice,
    0
  )

  // Weighted average cost and selling prices
  const avgCostPrice =
    totalStock > 0
      ? roundCurrency(totalValue / totalStock)
      : 0

  const totalSellingValue = activeBatches.reduce(
    (sum, b) => sum + b.remainingQty * b.sellingPrice,
    0
  )
  const avgSellingPrice =
    totalStock > 0
      ? roundCurrency(totalSellingValue / totalStock)
      : 0

  // Earliest expiry across active batches
  const expiryDates = activeBatches
    .filter((b) => b.expiryDate !== null)
    .map((b) => b.expiryDate as Date)
    .sort((a, b) => a.getTime() - b.getTime())

  const earliestExpiry = expiryDates.length > 0 ? expiryDates[0] : null

  return {
    ...product,
    totalStock,
    totalValue: roundCurrency(totalValue),
    avgCostPrice,
    avgSellingPrice,
    suggestedSellingPrice: activeBatches[0]?.sellingPrice || avgSellingPrice,
    activeBatchCount: activeBatches.length,
    earliestExpiry,
    isLowStock: totalStock > 0 && totalStock <= product.reorderLevel,
    isExpiringSoon: earliestExpiry !== null && earliestExpiry <= warningCutoff,
  }
}

// Import Product type for the helper function
import type { Product } from './models'

// ─── Inventory Valuation Reports ────────────────────────────────────────────

export interface InventoryValuation {
  totalProducts: number
  totalUnits: number
  totalCostValue: number
  totalSellingValue: number
  potentialProfit: number
  lowStockCount: number
  expiringSoonCount: number
  expiredCount: number
}

/**
 * Calculate full inventory valuation across all products and batches.
 */
export async function getInventoryValuation(): Promise<InventoryValuation> {
  const products = await getAllProductsWithStock()

  const activeBatches = await db.batches
    .filter((b) => b.isActive && b.remainingQty > 0)
    .toArray()

  const now = new Date()
  const expiredBatches = await db.batches
    .filter(
      (b) =>
        !b.isActive &&
        b.expiryDate !== null &&
        new Date(b.expiryDate).getTime() < now.getTime()
    )
    .count()

  const totalUnits = products.reduce((sum, p) => sum + p.totalStock, 0)
  const totalCostValue = products.reduce((sum, p) => sum + p.totalValue, 0)
  const totalSellingValue = activeBatches.reduce(
    (sum, b) => sum + b.remainingQty * b.sellingPrice,
    0
  )

  return {
    totalProducts: products.length,
    totalUnits,
    totalCostValue: roundCurrency(totalCostValue),
    totalSellingValue: roundCurrency(totalSellingValue),
    potentialProfit: roundCurrency(totalSellingValue - totalCostValue),
    lowStockCount: products.filter((p) => p.isLowStock).length,
    expiringSoonCount: products.filter((p) => p.isExpiringSoon).length,
    expiredCount: expiredBatches,
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

/**
 * Round to 2 decimal places for currency precision.
 */
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Generate a unique transaction ID for sales.
 * Format: PK-YYYYMMDD-XXXXXX (e.g., PK-20261028-A3F9B2)
 */
export function generateTransactionId(): string {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `PK-${datePart}-${randomPart}`
}

/**
 * Generate a batch number.
 * Format: B-YYYYMMDD-XXX (e.g., B-20261028-001)
 */
export function generateBatchNumber(sequenceNum: number): string {
  const now = new Date()
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '')
  const seqPart = String(sequenceNum).padStart(3, '0')
  return `B-${datePart}-${seqPart}`
}
