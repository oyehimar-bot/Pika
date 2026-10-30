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
  cashTendered?: number
  cashChange?: number
  storeName?: string
}

export interface ProcessSaleResult {
  success: boolean
  saleId?: number
  transactionId?: string
  receiptId?: number
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
  const {
    cartItems,
    paymentMethod,
    discount,
    tax,
    staffId,
    staffName,
    customerName,
    notes,
    cashTendered,
    cashChange,
    storeName,
  } = input

  if (cartItems.length === 0) {
    return { success: false, error: 'Cart is empty' }
  }

  // Step 1: Calculate FIFO allocations for all cart items
  const allocationResults = await Promise.all(
    cartItems.map(async (item) => {
      const listedPrice = item.unitPrice
      const actualSoldPrice =
        item.customPrice !== undefined && !isNaN(item.customPrice)
          ? item.customPrice
          : item.unitPrice
      const priceVariance = Math.round((actualSoldPrice - listedPrice) * 100) / 100

      const result = await calculateFIFOAllocation(item.productId, item.quantity)

      return {
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        listedPrice,
        actualSoldPrice,
        priceVariance,
        varianceNote: item.varianceNote,
        result,
      }
    })
  )

  // Check for any allocation failures
  const failures = allocationResults.filter((r) => !r.result.success)
  if (failures.length > 0) {
    const errorMessages = failures
      .map((f) => `${f.productName}: ${f.result.error}`)
      .join('; ')
    return { success: false, error: errorMessages }
  }

  // Step 2: Calculate totals using actual sold prices
  const subtotal = allocationResults.reduce(
    (sum, r) => sum + r.actualSoldPrice * r.quantity,
    0
  )
  const totalAmount = Math.max(0, Math.round((subtotal - discount + tax) * 100) / 100)
  const totalCost = allocationResults.reduce(
    (sum, r) => sum + r.result.totalCost,
    0
  )
  const totalProfit = Math.round((totalAmount - totalCost) * 100) / 100

  const transactionId = generateTransactionId()

  // Track if any negotiated price override happened
  const overriddenItems = allocationResults.filter((r) => r.priceVariance !== 0)

  // Step 3: Commit everything in a single transaction
  let saleId: number | undefined
  let receiptId: number | undefined

  try {
    await db.transaction(
      'rw',
      [db.sales, db.saleItems, db.batches, db.auditLogs, db.receipts],
      async () => {
        const saleTimestamp = new Date()

        // Create sale header
        saleId = await db.sales.add({
          transactionId,
          totalAmount,
          subtotal: Math.round(subtotal * 100) / 100,
          discount,
          tax,
          paymentMethod,
          staffId,
          staffName,
          customerName,
          notes,
          timestamp: saleTimestamp,
        })

        // Create sale items and deduct stock for each cart item
        for (const allocResult of allocationResults) {
          const { result, listedPrice, actualSoldPrice, priceVariance, varianceNote } = allocResult

          // Commit batch deductions
          await commitFIFODeduction(result.allocations)

          // Create sale item records (one per batch allocation)
          for (const alloc of result.allocations) {
            const lineTotal = Math.round(alloc.quantity * actualSoldPrice * 100) / 100
            const lineCost = Math.round(alloc.quantity * alloc.costPrice * 100) / 100
            const lineProfit = Math.round((lineTotal - lineCost) * 100) / 100

            await db.saleItems.add({
              saleId: saleId!,
              productId: allocResult.productId,
              productName: allocResult.productName,
              batchId: alloc.batchId,
              batchNumber: alloc.batchNumber,
              quantity: alloc.quantity,
              unitCostPrice: alloc.costPrice,
              unitSellingPrice: actualSoldPrice,
              listedPrice,
              actualSoldPrice,
              priceVariance,
              varianceNote,
              lineTotal,
              lineProfit,
            })
          }
        }

        // Create snapshot items for receipt history
        const receiptItems = allocationResults.map((r) => ({
          productId: r.productId,
          productName: r.productName,
          sku: r.sku,
          quantity: r.quantity,
          unitPrice: r.actualSoldPrice,
          lineTotal: Math.round(r.actualSoldPrice * r.quantity * 100) / 100,
          listedPrice: r.listedPrice,
          priceVariance: r.priceVariance,
          varianceNote: r.varianceNote,
        }))

        // Automatically store permanent receipt snapshot
        receiptId = await db.receipts.add({
          receiptNumber: transactionId,
          saleId: saleId!,
          transactionId,
          timestamp: saleTimestamp,
          staffId,
          staffName,
          customerName,
          paymentMethod,
          subtotal: Math.round(subtotal * 100) / 100,
          discount,
          tax,
          totalAmount,
          cashTendered,
          cashChange,
          itemCount: cartItems.length,
          items: receiptItems,
          notes,
          storeName,
        })

        // Audit log for sale completion
        await db.auditLogs.add({
          staffId,
          staffName,
          action: 'sale_completed',
          entity: 'sale',
          entityId: saleId,
          details: `Sale ${transactionId}: ₦${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${cartItems.length} item(s), ${paymentMethod})${
            overriddenItems.length > 0 ? ` • ${overriddenItems.length} price override(s)` : ''
          }`,
          metadata: {
            transactionId,
            totalAmount,
            totalCost,
            totalProfit,
            itemCount: cartItems.length,
            paymentMethod,
            discount,
            priceOverrides: overriddenItems.map((o) => ({
              product: o.productName,
              listed: o.listedPrice,
              actual: o.actualSoldPrice,
              variance: o.priceVariance,
              note: o.varianceNote,
            })),
          },
          timestamp: new Date(),
        })

        // If price variances occurred, log explicit discount_applied audit event
        for (const item of overriddenItems) {
          await db.auditLogs.add({
            staffId,
            staffName,
            action: 'discount_applied',
            entity: 'sale',
            entityId: saleId,
            details: `Price Override on "${item.productName}": ₦${item.listedPrice.toFixed(2)} → ₦${item.actualSoldPrice.toFixed(2)} (${item.priceVariance > 0 ? '+' : ''}₦${item.priceVariance.toFixed(2)})${
              item.varianceNote ? ` [Reason: ${item.varianceNote}]` : ''
            }`,
            metadata: {
              transactionId,
              productId: item.productId,
              productName: item.productName,
              listedPrice: item.listedPrice,
              actualSoldPrice: item.actualSoldPrice,
              priceVariance: item.priceVariance,
              varianceNote: item.varianceNote,
            },
            timestamp: new Date(),
          })
        }
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
    receiptId,
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
