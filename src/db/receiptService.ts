import { db } from './database'
import type { ReceiptSnapshot, SaleWithItems, PaymentMethod } from './models'

export interface ReceiptFilterOptions {
  query?: string
  startDate?: Date | null
  endDate?: Date | null
  paymentMethod?: PaymentMethod | 'all'
}

/**
 * Ensure historical sales are synced into receipts table.
 * If sales exist but receipts table is empty, backfill from sales and saleItems.
 */
export async function syncHistoricalReceipts(): Promise<void> {
  const [receiptCount, salesCount] = await Promise.all([
    db.receipts.count(),
    db.sales.count(),
  ])

  if (receiptCount === 0 && salesCount > 0) {
    const allSales = await db.sales.toArray()
    const allItems = await db.saleItems.toArray()

    const itemsBySaleId = new Map<number, typeof allItems>()
    for (const item of allItems) {
      const list = itemsBySaleId.get(item.saleId) || []
      list.push(item)
      itemsBySaleId.set(item.saleId, list)
    }

    const receiptsToBackfill: ReceiptSnapshot[] = allSales.map((sale) => {
      const saleItems = itemsBySaleId.get(sale.id!) || []
      return {
        receiptNumber: sale.transactionId,
        saleId: sale.id!,
        transactionId: sale.transactionId,
        timestamp: new Date(sale.timestamp),
        staffId: sale.staffId,
        staffName: sale.staffName,
        customerName: sale.customerName,
        paymentMethod: sale.paymentMethod,
        subtotal: sale.subtotal,
        discount: sale.discount,
        tax: sale.tax,
        totalAmount: sale.totalAmount,
        itemCount: saleItems.length,
        items: saleItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: `SKU-${item.productId}`,
          quantity: item.quantity,
          unitPrice: item.unitSellingPrice,
          lineTotal: item.lineTotal,
          listedPrice: item.listedPrice,
          priceVariance: item.priceVariance,
          varianceNote: item.varianceNote,
        })),
        notes: sale.notes,
      }
    })

    if (receiptsToBackfill.length > 0) {
      await db.receipts.bulkAdd(receiptsToBackfill)
    }
  }
}

/**
 * Get all receipts sorted chronologically (newest first).
 */
export async function getAllReceipts(): Promise<ReceiptSnapshot[]> {
  await syncHistoricalReceipts()
  const receipts = await db.receipts.toArray()
  return receipts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}

/**
 * Get a specific receipt by its internal DB id.
 */
export async function getReceiptById(id: number): Promise<ReceiptSnapshot | null> {
  const receipt = await db.receipts.get(id)
  return receipt || null
}

/**
 * Filter receipts with search text, date range, and payment method.
 */
export async function searchReceipts(
  filters: ReceiptFilterOptions
): Promise<ReceiptSnapshot[]> {
  const all = await getAllReceipts()
  const { query, startDate, endDate, paymentMethod } = filters

  return all.filter((r) => {
    // 1. Payment method filter
    if (paymentMethod && paymentMethod !== 'all' && r.paymentMethod !== paymentMethod) {
      return false
    }

    // 2. Date range filter
    const ts = new Date(r.timestamp).getTime()
    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      if (ts < start.getTime()) return false
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (ts > end.getTime()) return false
    }

    // 3. Search query filter: check Receipt ID, staff, customer, or any line item name/SKU
    if (query && query.trim()) {
      const q = query.toLowerCase().trim()
      const matchId =
        r.transactionId.toLowerCase().includes(q) ||
        r.receiptNumber.toLowerCase().includes(q)
      const matchStaff = r.staffName.toLowerCase().includes(q)
      const matchCustomer = r.customerName ? r.customerName.toLowerCase().includes(q) : false

      const matchProduct = r.items.some(
        (item) =>
          item.productName.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q)
      )

      if (!matchId && !matchStaff && !matchCustomer && !matchProduct) {
        return false
      }
    }

    return true
  })
}

/**
 * Convert a ReceiptSnapshot into SaleWithItems format for ReceiptModal thermal reprinting.
 */
export function convertReceiptToSaleWithItems(
  receipt: ReceiptSnapshot
): SaleWithItems {
  return {
    id: receipt.saleId,
    transactionId: receipt.transactionId,
    totalAmount: receipt.totalAmount,
    subtotal: receipt.subtotal,
    discount: receipt.discount,
    tax: receipt.tax,
    paymentMethod: receipt.paymentMethod,
    staffId: receipt.staffId,
    staffName: receipt.staffName,
    customerName: receipt.customerName,
    notes: receipt.notes,
    timestamp: new Date(receipt.timestamp),
    items: receipt.items.map((item, idx) => ({
      id: idx + 1,
      saleId: receipt.saleId,
      productId: item.productId,
      productName: item.productName,
      batchId: 0,
      batchNumber: 'LOT-SNAPSHOT',
      quantity: item.quantity,
      unitCostPrice: 0,
      unitSellingPrice: item.unitPrice,
      listedPrice: item.listedPrice,
      actualSoldPrice: item.unitPrice,
      priceVariance: item.priceVariance,
      varianceNote: item.varianceNote,
      lineTotal: item.lineTotal,
      lineProfit: 0,
    })),
    totalCost: 0,
    totalProfit: 0,
  }
}

/**
 * Generate a CSV export for filtered receipt entries.
 */
export function exportReceiptsToCSV(receipts: ReceiptSnapshot[]): string {
  const headers = [
    'Receipt Number',
    'Date & Time',
    'Staff Name',
    'Customer Name',
    'Payment Method',
    'Items Count',
    'Items Summary',
    'Subtotal (NGN)',
    'Discount (NGN)',
    'Tax (NGN)',
    'Total Amount (NGN)',
  ]

  const rows = receipts.map((r) => [
    r.receiptNumber,
    new Date(r.timestamp).toISOString(),
    `"${r.staffName.replace(/"/g, '""')}"`,
    `"${(r.customerName || 'Walk-in Customer').replace(/"/g, '""')}"`,
    r.paymentMethod.toUpperCase(),
    r.itemCount,
    `"${r.items.map((i) => `${i.productName} (${i.quantity}x)`).join('; ').replace(/"/g, '""')}"`,
    r.subtotal.toFixed(2),
    r.discount.toFixed(2),
    r.tax.toFixed(2),
    r.totalAmount.toFixed(2),
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}
