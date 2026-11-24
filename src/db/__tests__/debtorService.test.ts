import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../database'
import { recordCreditSale, recordDebtorPayment, getDebtorStats, getDebtorDetails } from '../debtorService'
import { addBatch } from '../fifoService'
import { processSale } from '../salesService'
import type { CartItem } from '../models'

describe('Debtor & Credit Sales Service', () => {
  beforeEach(async () => {
    await db.products.clear()
    await db.batches.clear()
    await db.sales.clear()
    await db.saleItems.clear()
    await db.debtors.clear()
    await db.creditPayments.clear()
    await db.auditLogs.clear()
    await db.receipts.clear()
  })

  it('creates a new debtor and updates balance when credit sale is made with no deposit', async () => {
    const debtor = await recordCreditSale({
      customerName: 'Alhaji Musa',
      customerPhone: '0803 123 4567',
      totalAmount: 50000,
      paidNow: 0,
      saleId: 101,
      staffId: '1',
      staffName: 'Cashier Alice',
    })

    expect(debtor).toBeDefined()
    expect(debtor.name).toBe('Alhaji Musa')
    expect(debtor.phone).toBe('08031234567')
    expect(debtor.balance).toBe(50000)
    expect(debtor.totalOwed).toBe(50000)
    expect(debtor.totalPaid).toBe(0)

    const stats = await getDebtorStats()
    expect(stats.totalOutstanding).toBe(50000)
    expect(stats.totalDebtors).toBe(1)
    expect(stats.activeDebtorsCount).toBe(1)
  })

  it('records initial deposit when partial payment is provided on credit sale', async () => {
    const debtor = await recordCreditSale({
      customerName: 'Grace Okafor',
      customerPhone: '08123456789',
      totalAmount: 100000,
      paidNow: 30000,
      paidNowMethod: 'transfer',
      saleId: 102,
      staffId: '1',
      staffName: 'Cashier Bob',
    })

    expect(debtor.balance).toBe(70000)
    expect(debtor.totalOwed).toBe(100000)
    expect(debtor.totalPaid).toBe(30000)

    const payments = await db.creditPayments.where('debtorId').equals(debtor.id!).toArray()
    expect(payments.length).toBe(1)
    expect(payments[0].amount).toBe(30000)
    expect(payments[0].paymentMethod).toBe('transfer')
    expect(payments[0].notes).toContain('deposit')
  })

  it('updates balance when debtor makes a subsequent payment', async () => {
    const debtor = await recordCreditSale({
      customerName: 'Chinedu Eze',
      customerPhone: '07011223344',
      totalAmount: 80000,
      paidNow: 20000,
      paidNowMethod: 'cash',
      saleId: 103,
      staffId: '1',
      staffName: 'Cashier Alice',
    })

    expect(debtor.balance).toBe(60000)

    // Make an installment payment of ₦40,000
    const payment = await recordDebtorPayment({
      debtorId: debtor.id!,
      amount: 40000,
      paymentMethod: 'transfer',
      notes: 'Part payment via bank transfer',
      staffId: '1',
      staffName: 'Cashier Alice',
    })

    expect(payment.amount).toBe(40000)
    expect(payment.paymentMethod).toBe('transfer')

    // Verify debtor record
    const updated = await db.debtors.get(debtor.id!)
    expect(updated?.balance).toBe(20000)
    expect(updated?.totalPaid).toBe(60000)

    // Pay off remaining ₦20,000
    await recordDebtorPayment({
      debtorId: debtor.id!,
      amount: 20000,
      paymentMethod: 'cash',
      staffId: '1',
      staffName: 'Cashier Alice',
    })

    const finalDebtor = await db.debtors.get(debtor.id!)
    expect(finalDebtor?.balance).toBe(0)
    expect(finalDebtor?.totalPaid).toBe(80000)

    const stats = await getDebtorStats()
    expect(stats.totalOutstanding).toBe(0)
    expect(stats.activeDebtorsCount).toBe(0)
    expect(stats.totalDebtors).toBe(1)
  })

  it('integrates seamlessly with processSale when paymentMethod is credit', async () => {
    // 1. Create product & stock
    const productId = (await db.products.add({
      name: 'Flour 50kg Bag',
      sku: 'FLOUR-50',
      category: 'Baking',
      unit: 'bags',
      barcode: '890123457',
      reorderLevel: 2,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    await addBatch({
      productId,
      batchNumber: 'FL-001',
      costPrice: 40000,
      sellingPrice: 55000,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: null,
      receivedDate: new Date(),
    })

    // 2. Process credit sale
    const cartItem: CartItem = {
      productId,
      productName: 'Flour 50kg Bag',
      sku: 'FLOUR-50',
      quantity: 2,
      unitPrice: 55000,
      maxAvailable: 10,
      batches: [],
    }

    const saleResult = await processSale({
      cartItems: [cartItem],
      paymentMethod: 'credit',
      customerName: 'Bakery Super Ltd',
      customerPhone: '08099887766',
      paidNow: 50000,
      paidNowMethod: 'transfer',
      staffId: '1',
      staffName: 'Admin',
    })

    expect(saleResult.success).toBe(true)
    expect(saleResult.totalAmount).toBe(110000)

    // 3. Verify debtor details
    const debtors = await db.debtors.toArray()
    expect(debtors.length).toBe(1)
    expect(debtors[0].name).toBe('Bakery Super Ltd')
    expect(debtors[0].balance).toBe(60000) // 110,000 - 50,000 = 60,000

    const details = await getDebtorDetails(debtors[0].id!)
    expect(details).not.toBeNull()
    expect(details?.sales.length).toBe(1)
    expect(details?.payments.length).toBe(1)
    expect(details?.payments[0].amount).toBe(50000)
  })
})
