import { db } from './database'
import type {
  Sale,
  SaleWithItems,
  CartItem,
  PaymentMethod,
} from './models'
import {
  calculateFIFOAllocation,
  commitFIFODeduction,
  generateTransactionId,
} from './fifoService'

/**
 * Sales Service
 *
 * Handles the complete sale lifecycle:
 * 1. Cart → FIFO allocation (preview)
 * 2. Commit sale + batch deductions in a single transaction
 * 3. Sale retrieval and reporting
 */

// ─── Sale Processing ────────────────────────────────────────────────────────

export interface ProcessSaleInput {
  cartItems: CartItem[]
  paymentMethod: PaymentMethod
  discount: number
  tax: number
  staffId: string
  staffName: string
  customerName?: string
  notes?: string
}

export interface ProcessSaleResult {
  success: boolean
  saleId?: number
  transactionId?: string
  totalAmount?: number
  totalProfit?: number
  error?: string
}

/**
 * Process a complete sale: validate cart, allocate FIFO batches,
 * create sale + items, and deduct stock — all in one transaction.
 */
export async function processSale(
  input: ProcessSaleInput
): Promise<ProcessSaleResult> {
  const { cartItems, paymentMethod, discount, tax, staffId, staffName, customerName, notes } = input

  if (cartItems.length === 0) {
    return { success: false, error: 'Cart is empty' }
  }

  // Step 1: Calculate FIFO allocations for all cart items
  const allocationResults = await Promise.all(
    cartItems.map(async (item) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      result: await calculateFIFOAllocation(item.productId, item.quantity),
    }))
  )

  // Check for any allocation failures
  const failures = allocationResults.filter((r) => !r.result.success)
  if (failures.length > 0) {
    const errorMessages = failures
      .map((f) => `${f.productName}: ${f.result.error}`)
      .join('; ')
    return { success: false, error: errorMessages }
  }

  // Step 2: Calculate totals
  const subtotal = allocationResults.reduce(
    (sum, r) => sum + r.result.totalRevenue,
    0
  )
  const totalAmount = Math.round((subtotal - discount + tax) * 100) / 100
  const totalCost = allocationResults.reduce(
    (sum, r) => sum + r.result.totalCost,
    0
  )
  const totalProfit = Math.round((totalAmount - totalCost) * 100) / 100

  const transactionId = generateTransactionId()

  // Step 3: Commit everything in a single transaction
  let saleId: number | undefined

  try {
    await db.transaction(
      'rw',
      [db.sales, db.saleItems, db.batches, db.auditLogs],
      async () => {
        // Create sale header
        saleId = await db.sales.add({
          transactionId,
          totalAmount,
          subtotal,
          discount,
          tax,
          paymentMethod,
          staffId,
          staffName,
          customerName,
          notes,
          timestamp: new Date(),
        })

        // Create sale items and deduct stock for each cart item
        for (const allocResult of allocationResults) {
          const { result } = allocResult

          // Commit batch deductions
          await commitFIFODeduction(result.allocations)

          // Create sale item records (one per batch allocation)
          for (const alloc of result.allocations) {
            const lineTotal = Math.round(alloc.quantity * alloc.sellingPrice * 100) / 100
            const lineCost = Math.round(alloc.quantity * alloc.costPrice * 100) / 100

            await db.saleItems.add({
              saleId: saleId!,
              productId: allocResult.productId,
              productName: allocResult.productName,
              batchId: alloc.batchId,
              batchNumber: alloc.batchNumber,
              quantity: alloc.quantity,
              unitCostPrice: alloc.costPrice,
              unitSellingPrice: alloc.sellingPrice,
              lineTotal,
              lineProfit: Math.round((lineTotal - lineCost) * 100) / 100,
            })
          }
        }

        // Audit log
        await db.auditLogs.add({
          staffId,
          staffName,
          action: 'sale_completed',
          entity: 'sale',
          entityId: saleId,
          details: `Sale ${transactionId}: ₦${totalAmount.toFixed(2)} ` +
            `(${cartItems.length} product(s), ${paymentMethod})`,
          metadata: {
            transactionId,
            totalAmount,
            totalCost,
            totalProfit,
            itemCount: cartItems.length,
            paymentMethod,
            discount,
          },
          timestamp: new Date(),
        })
      }
    )
  } catch (err) {
    return {
      success: false,
      error: `Transaction failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  return {
    success: true,
    saleId,
    transactionId,
    totalAmount,
    totalProfit,
  }
}

// ─── Sale Retrieval ─────────────────────────────────────────────────────────

/**
 * Get a sale with all its line items.
 */
export async function getSaleWithItems(
  saleId: number
): Promise<SaleWithItems | null> {
  const sale = await db.sales.get(saleId)
  if (!sale) return null

  const items = await db.saleItems
    .where('saleId')
    .equals(saleId)
    .toArray()

  const totalCost = items.reduce(
    (sum, item) => sum + item.unitCostPrice * item.quantity,
    0
  )
  const totalProfit = Math.round((sale.totalAmount - totalCost) * 100) / 100

  return {
    ...sale,
    items,
    totalProfit,
    totalCost: Math.round(totalCost * 100) / 100,
  }
}

/**
 * Get sales within a date range, with optional staff filter.
 */
export async function getSalesByDateRange(
  startDate: Date,
  endDate: Date,
  staffId?: string
): Promise<Sale[]> {
  let query = db.sales
    .where('timestamp')
    .between(startDate, endDate, true, true)

  if (staffId) {
    return query.and((s) => s.staffId === staffId).toArray()
  }

  return query.toArray()
}

/**
 * Get today's sales summary.
 */
export async function getTodaySalesSummary(): Promise<{
  count: number
  totalRevenue: number
  totalProfit: number
}> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const sales = await getSalesByDateRange(startOfDay, endOfDay)

  let totalRevenue = 0
  let totalProfit = 0

  for (const sale of sales) {
    totalRevenue += sale.totalAmount

    const items = await db.saleItems
      .where('saleId')
      .equals(sale.id!)
      .toArray()

    const saleCost = items.reduce(
      (sum, item) => sum + item.unitCostPrice * item.quantity,
      0
    )
    totalProfit += sale.totalAmount - saleCost
  }

  return {
    count: sales.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
  }
}

/**
 * Void a sale: reverse all batch deductions and mark sale as voided.
 */
export async function voidSale(
  saleId: number,
  reason: string,
  staffId: string,
  staffName: string
): Promise<{ success: boolean; error?: string }> {
  const sale = await db.sales.get(saleId)
  if (!sale) {
    return { success: false, error: 'Sale not found' }
  }

  const items = await db.saleItems
    .where('saleId')
    .equals(saleId)
    .toArray()

  try {
    await db.transaction(
      'rw',
      [db.batches, db.auditLogs],
      async () => {
        // Reverse batch deductions
        for (const item of items) {
          const batch = await db.batches.get(item.batchId)
          if (batch) {
            await db.batches.update(item.batchId, {
              remainingQty: batch.remainingQty + item.quantity,
              isActive: true,
            })
          }
        }

        // Audit log
        await db.auditLogs.add({
          staffId,
          staffName,
          action: 'sale_voided',
          entity: 'sale',
          entityId: saleId,
          details: `Sale ${sale.transactionId} voided. ₦${sale.totalAmount.toFixed(2)} reversed. Reason: ${reason}`,
          metadata: {
            transactionId: sale.transactionId,
            totalAmount: sale.totalAmount,
            reason,
            itemsReversed: items.length,
          },
          timestamp: new Date(),
        })
      }
    )
  } catch (err) {
    return {
      success: false,
      error: `Void failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  return { success: true }
}
