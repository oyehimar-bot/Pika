import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../database'
import { addBatch, getAllProductsWithStock, getInventoryValuation } from '../fifoService'

describe('Business Mode Filtering Logic', () => {
  let perishableProdId: number
  let durableProdId: number

  beforeEach(async () => {
    await db.products.clear()
    await db.batches.clear()
    await db.sales.clear()
    await db.saleItems.clear()
    await db.auditLogs.clear()
    await db.appSettings.clear()

    // 1. Create a Perishable Product (Milk)
    perishableProdId = (await db.products.add({
      name: 'Fresh Whole Milk (1L)',
      sku: 'DAI-MLK-01',
      category: 'Dairy',
      unit: 'bottle',
      reorderLevel: 5,
      barcode: '111222333',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    // Add batch WITH expiry date
    await addBatch({
      productId: perishableProdId,
      batchNumber: 'LOT-EXP-01',
      costPrice: 500,
      sellingPrice: 800,
      initialQty: 20,
      remainingQty: 20,
      expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // expires in 10 days
      receivedDate: new Date(),
    })

    // 2. Create a Non-Perishable Product (Screwdriver Set)
    durableProdId = (await db.products.add({
      name: 'Precision Screwdriver Set 24-in-1',
      sku: 'HRD-TOOL-01',
      category: 'Hardware',
      unit: 'set',
      reorderLevel: 2,
      barcode: '444555666',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    // Add batch WITHOUT expiry date
    await addBatch({
      productId: durableProdId,
      batchNumber: 'LOT-NOEXP-01',
      costPrice: 4000,
      sellingPrice: 7500,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: null,
      receivedDate: new Date(),
    })
  })

  it('in "no_expiry" mode, strictly filters out and hides products and batches that have expiry dates', async () => {
    // Set business mode to 'no_expiry'
    await db.appSettings.put({ key: 'business_mode', value: 'no_expiry' })

    const products = await getAllProductsWithStock(14)

    // Should only contain the durable product
    expect(products.length).toBe(1)
    expect(products[0].id).toBe(durableProdId)
    expect(products[0].name).toBe('Precision Screwdriver Set 24-in-1')
    expect(products[0].earliestExpiry).toBeNull()

    // Valuation should also strictly exclude perishable products
    const valuation = await getInventoryValuation()
    expect(valuation.totalProducts).toBe(1)
    expect(valuation.totalUnits).toBe(10) // Only the 10 screwdrivers, not the 20 milks
    expect(valuation.totalCostValue).toBe(40000) // 10 * 4000
    expect(valuation.expiringSoonCount).toBe(0)
  })

  it('in "expiry_only" mode, strictly filters for products that have expiry dates', async () => {
    await db.appSettings.put({ key: 'business_mode', value: 'expiry_only' })

    const products = await getAllProductsWithStock(14)

    expect(products.length).toBe(1)
    expect(products[0].id).toBe(perishableProdId)
    expect(products[0].name).toBe('Fresh Whole Milk (1L)')
    expect(products[0].earliestExpiry).not.toBeNull()

    const valuation = await getInventoryValuation()
    expect(valuation.totalProducts).toBe(1)
    expect(valuation.totalUnits).toBe(20)
    expect(valuation.totalCostValue).toBe(10000) // 20 * 500
  })

  it('in "hybrid" mode, includes both perishable and non-perishable merchandise', async () => {
    await db.appSettings.put({ key: 'business_mode', value: 'hybrid' })

    const products = await getAllProductsWithStock(14)

    expect(products.length).toBe(2)
    const productNames = products.map((p) => p.name)
    expect(productNames).toContain('Fresh Whole Milk (1L)')
    expect(productNames).toContain('Precision Screwdriver Set 24-in-1')

    const valuation = await getInventoryValuation()
    expect(valuation.totalProducts).toBe(2)
    expect(valuation.totalUnits).toBe(30)
    expect(valuation.totalCostValue).toBe(50000) // 10000 + 40000
  })
})
