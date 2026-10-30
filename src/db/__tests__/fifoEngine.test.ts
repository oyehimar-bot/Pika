import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  db,
  calculateFIFOAllocation,
  commitFIFODeduction,
  addBatch,
  adjustBatchStock,
  getExpiringBatches,
  flagExpiredBatches,
  getProductWithStock,
  getAllProductsWithStock,
  getInventoryValuation,
  processSale,
  voidSale,
  getSaleWithItems,
} from '../index'

describe('Pika Database & FIFO Inventory Engine', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.products.clear()
    await db.batches.clear()
    await db.sales.clear()
    await db.saleItems.clear()
    await db.auditLogs.clear()
    await db.staff.clear()
  })

  it('correctly calculates FIFO allocation across multiple batches (oldest first)', async () => {
    // 1. Create a product
    const productId = (await db.products.add({
      name: 'Whole Milk 1L',
      sku: 'MILK-001',
      category: 'Dairy',
      unit: 'bottle',
      reorderLevel: 10,
      barcode: '123456789012',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    // 2. Add 3 batches received at different dates with different costs
    // Oldest batch: 10 units @ ₦500 cost, selling @ ₦800
    const batch1Id = await addBatch({
      productId,
      batchNumber: 'B-001',
      costPrice: 500,
      sellingPrice: 800,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: new Date('2026-12-01'),
      receivedDate: new Date('2026-10-01'),
    })

    // Middle batch: 15 units @ ₦550 cost, selling @ ₦850
    const batch2Id = await addBatch({
      productId,
      batchNumber: 'B-002',
      costPrice: 550,
      sellingPrice: 850,
      initialQty: 15,
      remainingQty: 15,
      expiryDate: new Date('2026-12-15'),
      receivedDate: new Date('2026-10-10'),
    })

    // Newest batch: 20 units @ ₦600 cost, selling @ ₦900
    const batch3Id = await addBatch({
      productId,
      batchNumber: 'B-003',
      costPrice: 600,
      sellingPrice: 900,
      initialQty: 20,
      remainingQty: 20,
      expiryDate: new Date('2026-12-30'),
      receivedDate: new Date('2026-10-20'),
    })

    // Request 18 units:
    // Should take all 10 from Batch 1, and 8 from Batch 2
    const result = await calculateFIFOAllocation(productId, 18)

    expect(result.success).toBe(true)
    expect(result.allocations).toHaveLength(2)

    // First allocation: 10 units from B-001
    expect(result.allocations[0]).toEqual({
      batchId: batch1Id,
      batchNumber: 'B-001',
      quantity: 10,
      costPrice: 500,
      sellingPrice: 800,
    })

    // Second allocation: 8 units from B-002
    expect(result.allocations[1]).toEqual({
      batchId: batch2Id,
      batchNumber: 'B-002',
      quantity: 8,
      costPrice: 550,
      sellingPrice: 850,
    })

    // Cost: (10 * 500) + (8 * 550) = 5000 + 4400 = 9400
    expect(result.totalCost).toBe(9400)
    // Revenue: (10 * 800) + (8 * 850) = 8000 + 6800 = 14800
    expect(result.totalRevenue).toBe(14800)
    // Profit: 14800 - 9400 = 5400
    expect(result.profit).toBe(5400)

    // Now commit deduction to DB
    await commitFIFODeduction(result.allocations)

    // Verify batch remaining quantities in database
    const updatedBatch1 = await db.batches.get(batch1Id)
    const updatedBatch2 = await db.batches.get(batch2Id)
    const updatedBatch3 = await db.batches.get(batch3Id)

    expect(updatedBatch1?.remainingQty).toBe(0)
    expect(updatedBatch1?.isActive).toBe(false) // auto-deactivated when 0

    expect(updatedBatch2?.remainingQty).toBe(7) // 15 - 8
    expect(updatedBatch2?.isActive).toBe(true)

    expect(updatedBatch3?.remainingQty).toBe(20) // untouched
    expect(updatedBatch3?.isActive).toBe(true)
  })

  it('rejects allocation when requested quantity exceeds available stock', async () => {
    const productId = (await db.products.add({
      name: 'Sugar 1kg',
      sku: 'SUGAR-001',
      category: 'Pantry',
      unit: 'pack',
      reorderLevel: 5,
      barcode: '987654321',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    await addBatch({
      productId,
      batchNumber: 'B-SUGAR-1',
      costPrice: 300,
      sellingPrice: 450,
      initialQty: 5,
      remainingQty: 5,
      expiryDate: null,
      receivedDate: new Date(),
    })

    const result = await calculateFIFOAllocation(productId, 10)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Insufficient stock')
    expect(result.allocations).toHaveLength(0)
  })

  it('rejects zero or negative quantities', async () => {
    const resultZero = await calculateFIFOAllocation(1, 0)
    expect(resultZero.success).toBe(false)
    expect(resultZero.error).toBe('Quantity must be greater than zero')

    const resultNeg = await calculateFIFOAllocation(1, -5)
    expect(resultNeg.success).toBe(false)
    expect(resultNeg.error).toBe('Quantity must be greater than zero')
  })

  it('handles stock adjustments with audit logging', async () => {
    const productId = (await db.products.add({
      name: 'Flour 2kg',
      sku: 'FLOUR-001',
      category: 'Baking',
      unit: 'bag',
      reorderLevel: 5,
      barcode: '1122334455',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    const batchId = await addBatch({
      productId,
      batchNumber: 'B-FLOUR-1',
      costPrice: 400,
      sellingPrice: 600,
      initialQty: 20,
      remainingQty: 20,
      expiryDate: null,
      receivedDate: new Date(),
    })

    // Adjust down due to water damage (20 -> 16)
    const adjResult = await adjustBatchStock(
      batchId,
      16,
      'Water damage write-off',
      'staff-1',
      'John Cashier'
    )

    expect(adjResult.success).toBe(true)
    expect(adjResult.previousQty).toBe(20)
    expect(adjResult.newQty).toBe(16)

    const updatedBatch = await db.batches.get(batchId)
    expect(updatedBatch?.remainingQty).toBe(16)

    // Check audit log entry
    const auditLogs = await db.auditLogs.toArray()
    const adjustmentLog = auditLogs.find((l) => l.action === 'stock_adjustment')
    expect(adjustmentLog).toBeDefined()
    expect(adjustmentLog?.entityId).toBe(batchId)
    expect(adjustmentLog?.details).toContain('Water damage write-off')
    expect(adjustmentLog?.staffName).toBe('John Cashier')
  })

  it('detects near-expiry batches and auto-flags expired batches', async () => {
    const productId = (await db.products.add({
      name: 'Yogurt 500ml',
      sku: 'YOG-001',
      category: 'Dairy',
      unit: 'cup',
      reorderLevel: 5,
      barcode: '5566778899',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    const now = new Date()
    const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Batch 1: Expiring in 5 days
    await addBatch({
      productId,
      batchNumber: 'B-EXP-SOON',
      costPrice: 200,
      sellingPrice: 350,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: fiveDaysLater,
      receivedDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    })

    // Batch 2: Already expired yesterday
    const expiredBatchId = await addBatch({
      productId,
      batchNumber: 'B-EXPIRED',
      costPrice: 200,
      sellingPrice: 350,
      initialQty: 8,
      remainingQty: 8,
      expiryDate: yesterday,
      receivedDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    })

    // Check near-expiry warnings (look ahead 7 days)
    const warnings = await getExpiringBatches(7)
    expect(warnings.some((w) => w.batchNumber === 'B-EXP-SOON')).toBe(true)

    // Auto-flag expired batches
    const flagged = await flagExpiredBatches()
    expect(flagged).toBe(1)

    const updatedExpired = await db.batches.get(expiredBatchId)
    expect(updatedExpired?.isActive).toBe(false)

    // Check audit log for batch_expired
    const expiredLog = await db.auditLogs.where('action').equals('batch_expired').first()
    expect(expiredLog).toBeDefined()
    expect(expiredLog?.entityId).toBe(expiredBatchId)
  })

  it('computes accurate aggregated product stock and full inventory valuation', async () => {
    const prod1Id = (await db.products.add({
      name: 'Bread White 500g',
      sku: 'BRD-001',
      category: 'Bakery',
      unit: 'loaf',
      reorderLevel: 15,
      barcode: '99001122',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    await addBatch({
      productId: prod1Id,
      batchNumber: 'B-BRD-1',
      costPrice: 300,
      sellingPrice: 500,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: new Date('2026-11-20'),
      receivedDate: new Date(),
    })

    const prodWithStock = await getProductWithStock(prod1Id)
    expect(prodWithStock).toBeDefined()
    expect(prodWithStock?.totalStock).toBe(10)
    expect(prodWithStock?.totalValue).toBe(3000) // 10 * 300
    expect(prodWithStock?.isLowStock).toBe(true) // 10 <= reorderLevel 15

    const allProducts = await getAllProductsWithStock()
    expect(allProducts).toHaveLength(1)

    const valuation = await getInventoryValuation()
    expect(valuation.totalProducts).toBe(1)
    expect(valuation.totalUnits).toBe(10)
    expect(valuation.totalCostValue).toBe(3000)
    expect(valuation.totalSellingValue).toBe(5000)
    expect(valuation.potentialProfit).toBe(2000)
  })

  it('processes a full sale end-to-end with FIFO deduction, sale items, and can void it', async () => {
    const productId = (await db.products.add({
      name: 'Cooking Oil 1L',
      sku: 'OIL-001',
      category: 'Pantry',
      unit: 'bottle',
      reorderLevel: 5,
      barcode: '4455667788',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    const batch1Id = await addBatch({
      productId,
      batchNumber: 'B-OIL-1',
      costPrice: 800,
      sellingPrice: 1200,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: null,
      receivedDate: new Date('2026-10-01'),
    })

    const batch2Id = await addBatch({
      productId,
      batchNumber: 'B-OIL-2',
      costPrice: 850,
      sellingPrice: 1200,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: null,
      receivedDate: new Date('2026-10-15'),
    })

    // Process a sale of 12 units
    const saleResult = await processSale({
      cartItems: [
        {
          productId,
          productName: 'Cooking Oil 1L',
          sku: 'OIL-001',
          quantity: 12,
          unitPrice: 1200,
          maxAvailable: 20,
          batches: [],
        },
      ],
      paymentMethod: 'card',
      discount: 200,
      tax: 0,
      staffId: 'staff-1',
      staffName: 'Alice',
      customerName: 'Customer X',
    })

    expect(saleResult.success).toBe(true)
    expect(saleResult.saleId).toBeDefined()
    expect(saleResult.totalAmount).toBe(14200) // (12 * 1200) - 200 discount = 14400 - 200 = 14200
    // Total cost: (10 * 800) + (2 * 850) = 8000 + 1700 = 9700
    // Total profit: 14200 - 9700 = 4500
    expect(saleResult.totalProfit).toBe(4500)

    // Verify batch deductions in DB
    const b1 = await db.batches.get(batch1Id)
    const b2 = await db.batches.get(batch2Id)
    expect(b1?.remainingQty).toBe(0)
    expect(b2?.remainingQty).toBe(8) // 10 - 2

    // Retrieve sale with items
    const saleDetails = await getSaleWithItems(saleResult.saleId!)
    expect(saleDetails).toBeDefined()
    expect(saleDetails?.items).toHaveLength(2) // 2 sale items for the 2 batches
    expect(saleDetails?.totalCost).toBe(9700)
    expect(saleDetails?.totalProfit).toBe(4500)

    // Now void the sale
    const voidResult = await voidSale(saleResult.saleId!, 'Customer returned', 'staff-1', 'Alice')
    expect(voidResult.success).toBe(true)

    // Check batches are restored!
    const restoredB1 = await db.batches.get(batch1Id)
    const restoredB2 = await db.batches.get(batch2Id)
    expect(restoredB1?.remainingQty).toBe(10)
    expect(restoredB1?.isActive).toBe(true)
    expect(restoredB2?.remainingQty).toBe(10)
  })
})
