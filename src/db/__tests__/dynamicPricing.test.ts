import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../database'
import { addBatch } from '../fifoService'
import { processSale, getSaleWithItems } from '../salesService'
import type { CartItem } from '../models'

describe('Dynamic Pricing & Price Variance Audit Trail', () => {
  beforeEach(async () => {
    await db.products.clear()
    await db.batches.clear()
    await db.sales.clear()
    await db.saleItems.clear()
    await db.auditLogs.clear()
    await db.appSettings.clear()
  })

  it('records price variance, customPrice, and recalculates net profit against FIFO batch cost', async () => {
    // 1. Create a product
    const productId = (await db.products.add({
      name: 'Wireless Bluetooth Headphones',
      sku: 'AUDIO-HP-01',
      category: 'Electronics',
      unit: 'pcs',
      reorderLevel: 5,
      barcode: '987654321',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    // 2. Add an incoming batch: Cost Price = ₦8,000, Listed Selling Price = ₦12,000, Qty = 10
    await addBatch({
      productId,
      batchNumber: 'BAT-AUDIO-001',
      costPrice: 8000,
      sellingPrice: 12000,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: null,
      receivedDate: new Date(),
    })

    // 3. Cashier negotiates a discounted price with customer:
    // Listed = ₦12,000, Custom/Actual = ₦10,500 (Variance = -₦1,500)
    const cartItem: CartItem = {
      productId,
      productName: 'Wireless Bluetooth Headphones',
      sku: 'AUDIO-HP-01',
      quantity: 2,
      unitPrice: 12000,
      customPrice: 10500, // Negotiated discount price
      varianceNote: 'Customer negotiation - repeat corporate buyer',
      maxAvailable: 10,
      batches: [],
    }

    const saleResult = await processSale({
      cartItems: [cartItem],
      paymentMethod: 'transfer',
      discount: 0,
      tax: 0,
      staffId: 'staff-01',
      staffName: 'Adeola Johnson',
      customerName: 'TechCorp Africa',
    })

    expect(saleResult.success).toBe(true)
    expect(saleResult.saleId).toBeDefined()

    // 4. Verify sale record
    const sale = await getSaleWithItems(saleResult.saleId!)
    expect(sale).not.toBeNull()
    expect(sale!.totalAmount).toBe(21000) // 2 * 10500
    expect(sale!.subtotal).toBe(21000)

    // 5. Verify sale item variance tracking
    expect(sale!.items.length).toBe(1)
    const item = sale!.items[0]
    expect(item.listedPrice).toBe(12000)
    expect(item.actualSoldPrice).toBe(10500)
    expect(item.priceVariance).toBe(-1500)
    expect(item.varianceNote).toBe('Customer negotiation - repeat corporate buyer')

    // 6. Verify true net profit recalculation
    // Cost = 2 * 8000 = 16000. Sold = 2 * 10500 = 21000. True Profit = 21000 - 16000 = 5000.
    expect(item.lineTotal).toBe(21000)
    expect(item.lineProfit).toBe(5000)

    // 7. Verify audit log captures price override event
    const auditLogs = await db.auditLogs.toArray()
    const discountAudit = auditLogs.find((l) => l.action === 'discount_applied')
    expect(discountAudit).toBeDefined()
    expect(discountAudit!.details).toContain('Price Override')
    expect(discountAudit!.details).toContain('₦12000.00 → ₦10500.00')
    expect(discountAudit!.details).toContain('Customer negotiation - repeat corporate buyer')
  })

  it('persists and loads business mode preference in appSettings table', async () => {
    await db.appSettings.put({ key: 'business_mode', value: 'no_expiry' })
    await db.appSettings.put({ key: 'store_name', value: 'Prime Tech Hub' })

    const modeSetting = await db.appSettings.get('business_mode')
    const nameSetting = await db.appSettings.get('store_name')

    expect(modeSetting?.value).toBe('no_expiry')
    expect(nameSetting?.value).toBe('Prime Tech Hub')
  })
})
