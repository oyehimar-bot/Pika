import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../database'
import { addBatch } from '../fifoService'
import { processSale } from '../salesService'
import { getComprehensiveSalesAnalytics } from '../salesAnalyticsService'
import type { CartItem } from '../models'

describe('Daily & Monthly Sales Analytics & Reporting Engine', () => {
  beforeEach(async () => {
    await db.products.clear()
    await db.batches.clear()
    await db.sales.clear()
    await db.saleItems.clear()
    await db.receipts.clear()
    await db.auditLogs.clear()
  })

  it('computes daily sales KPIs, FIFO net profit, and payment channel distribution', async () => {
    const prodId = (await db.products.add({
      name: 'Anker USB-C Fast Charger',
      sku: 'ANK-CHG-65W',
      category: 'Accessories',
      unit: 'pcs',
      reorderLevel: 5,
      barcode: '123456',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    // Batch: Cost = ₦6,000, Selling = ₦10,000, Qty = 20
    await addBatch({
      productId: prodId,
      batchNumber: 'LOT-ANK-01',
      costPrice: 6000,
      sellingPrice: 10000,
      initialQty: 20,
      remainingQty: 20,
      expiryDate: null,
      receivedDate: new Date(),
    })

    const cartItem: CartItem = {
      productId: prodId,
      productName: 'Anker USB-C Fast Charger',
      sku: 'ANK-CHG-65W',
      quantity: 3, // Revenue = 30,000, Cost = 18,000, Net Profit = 12,000
      unitPrice: 10000,
      maxAvailable: 20,
      batches: [],
    }

    // Process Sale 1: Cash
    await processSale({
      cartItems: [cartItem],
      paymentMethod: 'cash',
      discount: 0,
      tax: 0,
      staffId: '1',
      staffName: 'Cashier 1',
    })

    // Process Sale 2: Transfer
    await processSale({
      cartItems: [{ ...cartItem, quantity: 2 }], // Revenue = 20,000, Cost = 12,000, Profit = 8,000
      paymentMethod: 'transfer',
      discount: 0,
      tax: 0,
      staffId: '1',
      staffName: 'Cashier 1',
    })

    const analytics = await getComprehensiveSalesAnalytics('today')

    expect(analytics.kpis.transactionCount).toBe(2)
    expect(analytics.kpis.totalRevenue).toBe(50000)
    expect(analytics.kpis.totalCost).toBe(30000)
    expect(analytics.kpis.netProfit).toBe(20000)
    expect(analytics.kpis.profitMargin).toBe(40) // 20k / 50k = 40%
    expect(analytics.kpis.itemsSold).toBe(5)

    // Check payment method breakdown
    const cashShare = analytics.paymentBreakdown.find((p) => p.method === 'cash')
    const transferShare = analytics.paymentBreakdown.find((p) => p.method === 'transfer')
    const cardShare = analytics.paymentBreakdown.find((p) => p.method === 'card')

    expect(cashShare?.revenue).toBe(30000)
    expect(cashShare?.percentage).toBe(60)
    expect(transferShare?.revenue).toBe(20000)
    expect(transferShare?.percentage).toBe(40)
    expect(cardShare?.revenue).toBe(0)
    expect(cardShare?.percentage).toBe(0)

    // Check today summary matches
    expect(analytics.todaySummary.totalRevenue).toBe(50000)
    expect(analytics.todaySummary.netProfit).toBe(20000)
    expect(analytics.dailyBreakdown.length).toBe(1)
  })

  it('aggregates monthly sales summaries and historical monthly comparative breakdown', async () => {
    const prodId = (await db.products.add({
      name: 'Wireless Earbuds Pro',
      sku: 'EAR-PRO-01',
      category: 'Audio',
      unit: 'pcs',
      reorderLevel: 2,
      barcode: '998877',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    await addBatch({
      productId: prodId,
      batchNumber: 'LOT-EAR-01',
      costPrice: 12000,
      sellingPrice: 18000,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: null,
      receivedDate: new Date(),
    })

    // Sale in current month
    await processSale({
      cartItems: [
        {
          productId: prodId,
          productName: 'Wireless Earbuds Pro',
          sku: 'EAR-PRO-01',
          quantity: 2,
          unitPrice: 18000,
          maxAvailable: 10,
          batches: [],
        },
      ],
      paymentMethod: 'card',
      discount: 0,
      tax: 0,
      staffId: 'mgr',
      staffName: 'Manager',
    })

    const analytics = await getComprehensiveSalesAnalytics('this_month')

    expect(analytics.currentMonthSummary.totalRevenue).toBe(36000)
    expect(analytics.currentMonthSummary.totalCost).toBe(24000)
    expect(analytics.currentMonthSummary.netProfit).toBe(12000)
    expect(analytics.monthlyBreakdown.length).toBeGreaterThanOrEqual(1)
    expect(analytics.monthlyBreakdown[0].revenue).toBe(36000)
  })
})

