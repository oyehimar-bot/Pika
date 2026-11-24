import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../database'
import { addBatch } from '../fifoService'
import { processSale } from '../salesService'
import type { CartItem } from '../models'

describe('Carton vs Piece FIFO Depletion', () => {
  beforeEach(async () => {
    await db.products.clear()
    await db.batches.clear()
    await db.sales.clear()
    await db.saleItems.clear()
    await db.auditLogs.clear()
    await db.receipts.clear()
  })

  it('depletes stock by piecesPerCarton multiplier when sale unitType is carton (ctn)', async () => {
    // 1. Create a product sold both by pieces and in cartons of 24
    const productId = (await db.products.add({
      name: 'Indomie Instant Noodles 70g',
      sku: 'NOOD-IND-70',
      category: 'Food',
      unit: 'pieces',
      barcode: '890123456',
      piecesPerCarton: 24,
      wholesalePrice: 4500,       // ₦4,500 per carton of 24
      reorderLevel: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    // 2. Add a batch with 72 pieces (i.e. 3 cartons)
    const batchId = await addBatch({
      productId,
      batchNumber: 'IND-LOT-01',
      costPrice: 150,     // cost ₦150 per piece
      sellingPrice: 200,
      initialQty: 72,
      remainingQty: 72,
      expiryDate: null,
      receivedDate: new Date(),
    })

    // 3. Sell 2 cartons (ctn)
    const cartItem: CartItem = {
      productId,
      productName: 'Indomie Instant Noodles 70g',
      sku: 'NOOD-IND-70',
      quantity: 2,
      unitType: 'ctn',
      piecesPerCarton: 24,
      unitPrice: 4500,
      maxAvailable: 72,
      batches: [],
    }

    const saleResult = await processSale({
      cartItems: [cartItem],
      paymentMethod: 'cash',
      staffName: 'Cashier Alice',
    })

    expect(saleResult.success).toBe(true)
    expect(saleResult.totalAmount).toBe(9000) // 2 * 4500 = 9000

    // 4. Verify batch remainingQty: 72 - (2 cartons * 24 pcs) = 24 pcs remaining!
    const batch = await db.batches.get(batchId)
    expect(batch?.remainingQty).toBe(24)

    // 5. Verify saleItem records piece multiplier for FIFO batch deduction
    const saleItems = await db.saleItems.where('saleId').equals(saleResult.saleId!).toArray()
    expect(saleItems.length).toBe(1)
    expect(saleItems[0].quantity).toBe(48) // 2 cartons * 24 pieces
    expect(saleItems[0].unitType).toBe('ctn')
    expect(saleItems[0].piecesPerCarton).toBe(24)

    // 6. Verify receipt snapshot records customer-facing carton units
    const receipts = await db.receipts.where('saleId').equals(saleResult.saleId!).toArray()
    expect(receipts.length).toBe(1)
    expect(receipts[0].items[0].quantity).toBe(2)
    expect(receipts[0].items[0].unitType).toBe('ctn')
  })

  it('depletes stock piece-by-piece when sale unitType is pc', async () => {
    const productId = (await db.products.add({
      name: 'Indomie Instant Noodles 70g',
      sku: 'NOOD-IND-70',
      category: 'Food',
      unit: 'pieces',
      barcode: '890123456',
      piecesPerCarton: 24,
      wholesalePrice: 4500,
      reorderLevel: 10,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    const batchId = await addBatch({
      productId,
      batchNumber: 'IND-LOT-02',
      costPrice: 150,
      sellingPrice: 200,
      initialQty: 24,
      remainingQty: 24,
      expiryDate: null,
      receivedDate: new Date(),
    })

    const cartItem: CartItem = {
      productId,
      productName: 'Indomie Instant Noodles 70g',
      sku: 'NOOD-IND-70',
      quantity: 5,
      unitType: 'pc',
      piecesPerCarton: 24,
      unitPrice: 200,
      maxAvailable: 24,
      batches: [],
    }

    const saleResult = await processSale({
      cartItems: [cartItem],
      paymentMethod: 'cash',
      staffName: 'Cashier Bob',
    })

    expect(saleResult.success).toBe(true)
    expect(saleResult.totalAmount).toBe(1000)

    const batch = await db.batches.get(batchId)
    expect(batch?.remainingQty).toBe(19) // 24 - 5 = 19
  })
})
