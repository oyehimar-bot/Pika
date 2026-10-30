import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../database'
import { addBatch } from '../fifoService'
import { processSale } from '../salesService'
import {
  getAllReceipts,
  getReceiptById,
  searchReceipts,
  convertReceiptToSaleWithItems,
  exportReceiptsToCSV,
} from '../receiptService'
import type { CartItem } from '../models'

describe('Receipt Snapshot Storage & History Service', () => {
  beforeEach(async () => {
    await db.products.clear()
    await db.batches.clear()
    await db.sales.clear()
    await db.saleItems.clear()
    await db.receipts.clear()
    await db.auditLogs.clear()
  })

  it('automatically stores a persistent receipt snapshot upon completing a sale', async () => {
    const productId = (await db.products.add({
      name: 'Sony DualSense Controller',
      sku: 'GAMING-SONY-01',
      category: 'Gaming',
      unit: 'pcs',
      reorderLevel: 2,
      barcode: '5566778899',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    await addBatch({
      productId,
      batchNumber: 'LOT-SONY-01',
      costPrice: 45000,
      sellingPrice: 65000,
      initialQty: 5,
      remainingQty: 5,
      expiryDate: null,
      receivedDate: new Date(),
    })

    const cartItem: CartItem = {
      productId,
      productName: 'Sony DualSense Controller',
      sku: 'GAMING-SONY-01',
      quantity: 1,
      unitPrice: 65000,
      maxAvailable: 5,
      batches: [],
    }

    const saleResult = await processSale({
      cartItems: [cartItem],
      paymentMethod: 'card',
      discount: 2000,
      tax: 0,
      staffId: 'cashier-1',
      staffName: 'Chioma Cashier',
      customerName: 'Emeka Nwosu',
      notes: 'Customer asked for quick warranty receipt',
      cashTendered: undefined,
      cashChange: undefined,
    })

    expect(saleResult.success).toBe(true)
    expect(saleResult.receiptId).toBeDefined()

    // Query receipts directly from database
    const savedReceipt = await db.receipts.get(saleResult.receiptId!)
    expect(savedReceipt).toBeDefined()
    expect(savedReceipt?.transactionId).toBe(saleResult.transactionId)
    expect(savedReceipt?.paymentMethod).toBe('card')
    expect(savedReceipt?.totalAmount).toBe(63000)
    expect(savedReceipt?.discount).toBe(2000)
    expect(savedReceipt?.staffName).toBe('Chioma Cashier')
    expect(savedReceipt?.customerName).toBe('Emeka Nwosu')
    expect(savedReceipt?.itemCount).toBe(1)
    expect(savedReceipt?.items[0].productName).toBe('Sony DualSense Controller')
  })

  it('filters receipts by receipt number, customer, and product name in line items', async () => {
    const prod1 = (await db.products.add({
      name: 'HP Wireless Mouse',
      sku: 'HP-MOU-01',
      category: 'Electronics',
      unit: 'pcs',
      reorderLevel: 5,
      barcode: '111',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    const prod2 = (await db.products.add({
      name: 'Mechanical Gaming Keyboard',
      sku: 'KEY-MECH-02',
      category: 'Electronics',
      unit: 'pcs',
      reorderLevel: 5,
      barcode: '222',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    await addBatch({
      productId: prod1,
      batchNumber: 'LOT-HP-01',
      costPrice: 5000,
      sellingPrice: 8000,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: null,
      receivedDate: new Date(),
    })

    await addBatch({
      productId: prod2,
      batchNumber: 'LOT-KEY-01',
      costPrice: 15000,
      sellingPrice: 22000,
      initialQty: 5,
      remainingQty: 5,
      expiryDate: null,
      receivedDate: new Date(),
    })

    // Sale 1: Mouse
    await processSale({
      cartItems: [
        {
          productId: prod1,
          productName: 'HP Wireless Mouse',
          sku: 'HP-MOU-01',
          quantity: 2,
          unitPrice: 8000,
          maxAvailable: 10,
          batches: [],
        },
      ],
      paymentMethod: 'cash',
      discount: 0,
      tax: 0,
      staffId: '1',
      staffName: 'Alice',
      customerName: 'John Doe',
      cashTendered: 20000,
      cashChange: 4000,
    })

    // Sale 2: Keyboard
    await processSale({
      cartItems: [
        {
          productId: prod2,
          productName: 'Mechanical Gaming Keyboard',
          sku: 'KEY-MECH-02',
          quantity: 1,
          unitPrice: 22000,
          maxAvailable: 5,
          batches: [],
        },
      ],
      paymentMethod: 'transfer',
      discount: 1000,
      tax: 0,
      staffId: '2',
      staffName: 'Bob',
      customerName: 'Sarah Connor',
    })

    // All receipts
    const all = await getAllReceipts()
    expect(all.length).toBe(2)

    // Filter by product name: 'Mouse'
    const mouseResults = await searchReceipts({ query: 'Mouse' })
    expect(mouseResults.length).toBe(1)
    expect(mouseResults[0].customerName).toBe('John Doe')

    // Filter by product name: 'Keyboard'
    const keyboardResults = await searchReceipts({ query: 'Keyboard' })
    expect(keyboardResults.length).toBe(1)
    expect(keyboardResults[0].customerName).toBe('Sarah Connor')

    // Filter by payment method: 'transfer'
    const transferResults = await searchReceipts({ paymentMethod: 'transfer' })
    expect(transferResults.length).toBe(1)
    expect(transferResults[0].totalAmount).toBe(21000)
  })

  it('converts a receipt snapshot into SaleWithItems format and exports CSV', async () => {
    const prodId = (await db.products.add({
      name: 'Samsung 4K Monitor',
      sku: 'SAM-MON-4K',
      category: 'Displays',
      unit: 'pcs',
      reorderLevel: 1,
      barcode: '999888',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    await addBatch({
      productId: prodId,
      batchNumber: 'LOT-SAM-01',
      costPrice: 120000,
      sellingPrice: 165000,
      initialQty: 2,
      remainingQty: 2,
      expiryDate: null,
      receivedDate: new Date(),
    })

    const sale = await processSale({
      cartItems: [
        {
          productId: prodId,
          productName: 'Samsung 4K Monitor',
          sku: 'SAM-MON-4K',
          quantity: 1,
          unitPrice: 165000,
          maxAvailable: 2,
          batches: [],
        },
      ],
      paymentMethod: 'card',
      discount: 5000,
      tax: 0,
      staffId: 'admin',
      staffName: 'Store Admin',
      customerName: 'Tunde Bakare',
    })

    const receipt = await getReceiptById(sale.receiptId!)
    expect(receipt).not.toBeNull()

    const modalData = convertReceiptToSaleWithItems(receipt!)
    expect(modalData.transactionId).toBe(sale.transactionId)
    expect(modalData.totalAmount).toBe(160000)
    expect(modalData.items.length).toBe(1)
    expect(modalData.items[0].productName).toBe('Samsung 4K Monitor')

    // CSV format validation
    const csv = exportReceiptsToCSV([receipt!])
    expect(csv).toContain('Receipt Number')
    expect(csv).toContain('Samsung 4K Monitor')
    expect(csv).toContain('CARD')
    expect(csv).toContain('160000.00')
  })
})

