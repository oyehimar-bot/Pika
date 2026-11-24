import { db } from './database'
import type { Debtor, CreditPayment, Sale } from './models'

export interface RecordCreditSaleInput {
  saleId: number
  customerName: string
  customerPhone?: string
  totalAmount: number
  paidNow?: number
  paidNowMethod?: 'cash' | 'transfer' | 'card'
  staffId: string
  staffName: string
  notes?: string
}

export interface RecordPaymentInput {
  debtorId: number
  amount: number
  paymentMethod: 'cash' | 'transfer' | 'card'
  staffId: string
  staffName: string
  notes?: string
}

export interface DebtorStats {
  totalOutstanding: number
  totalCreditGiven: number
  totalCollected: number
  totalDebtors: number
  activeDebtorsCount: number
}

export interface DebtorDetails extends Debtor {
  sales: Sale[]
  payments: CreditPayment[]
}

/**
 * Clean phone number for consistency.
 */
export function normalizePhone(phone?: string): string {
  if (!phone) return ''
  return phone.replace(/[^\d+]/g, '')
}

/**
 * Record a credit sale against a customer/debtor.
 * Automatically creates or updates the debtor account and logs initial deposit.
 */
export async function recordCreditSale(input: RecordCreditSaleInput): Promise<Debtor> {
  const {
    saleId,
    customerName,
    customerPhone = '',
    totalAmount,
    paidNow = 0,
    paidNowMethod = 'cash',
    staffId,
    staffName,
    notes,
  } = input

  const cleanPhone = normalizePhone(customerPhone)
  const cleanName = customerName.trim()

  return await db.transaction('rw', [db.debtors, db.creditPayments, db.auditLogs], async () => {
    // Look up existing debtor by phone (if available) or by exact name match
    let debtor: Debtor | undefined
    if (cleanPhone) {
      debtor = await db.debtors.where('phone').equals(cleanPhone).first()
    }
    if (!debtor) {
      debtor = await db.debtors
        .filter((d) => d.name.toLowerCase() === cleanName.toLowerCase())
        .first()
    }

    const now = new Date()

    if (debtor && debtor.id) {
      const newTotalOwed = debtor.totalOwed + totalAmount
      const newTotalPaid = debtor.totalPaid + paidNow
      const newBalance = Math.max(0, newTotalOwed - newTotalPaid)

      await db.debtors.update(debtor.id, {
        name: cleanName || debtor.name,
        phone: cleanPhone || debtor.phone,
        totalOwed: newTotalOwed,
        totalPaid: newTotalPaid,
        balance: newBalance,
        lastPaymentDate: paidNow > 0 ? now : debtor.lastPaymentDate,
        updatedAt: now,
      })

      debtor = (await db.debtors.get(debtor.id))!
    } else {
      const initialPaid = paidNow
      const initialBalance = Math.max(0, totalAmount - initialPaid)

      const id = (await db.debtors.add({
        name: cleanName || 'Valued Customer',
        phone: cleanPhone,
        totalOwed: totalAmount,
        totalPaid: initialPaid,
        balance: initialBalance,
        lastPaymentDate: initialPaid > 0 ? now : undefined,
        createdAt: now,
        updatedAt: now,
      })) as number

      debtor = (await db.debtors.get(id))!
    }

    // If customer paid an upfront deposit at checkout, record it in creditPayments
    if (paidNow > 0 && debtor.id) {
      await db.creditPayments.add({
        debtorId: debtor.id,
        saleId,
        amount: paidNow,
        paymentMethod: paidNowMethod,
        staffId,
        staffName,
        notes: notes || 'Upfront deposit at checkout',
        timestamp: now,
      })
    }

    // Audit log
    await db.auditLogs.add({
      staffId,
      staffName,
      action: 'debtor_created',
      entity: 'debtor',
      entityId: debtor.id,
      details: `Credit sale recorded for "${debtor.name}": ₦${totalAmount.toLocaleString('en-NG')} (Paid now: ₦${paidNow.toLocaleString('en-NG')}, Balance: ₦${debtor.balance.toLocaleString('en-NG')})`,
      metadata: { saleId, totalAmount, paidNow, balance: debtor.balance },
      timestamp: now,
    })

    return debtor
  })
}

/**
 * Record a payment collected from a debtor.
 */
export async function recordDebtorPayment(input: RecordPaymentInput): Promise<CreditPayment> {
  const { debtorId, amount, paymentMethod, staffId, staffName, notes } = input

  if (amount <= 0) {
    throw new Error('Payment amount must be greater than zero.')
  }

  return await db.transaction('rw', [db.debtors, db.creditPayments, db.auditLogs], async () => {
    const debtor = await db.debtors.get(debtorId)
    if (!debtor) {
      throw new Error(`Debtor with ID ${debtorId} does not exist.`)
    }

    const now = new Date()
    const paymentId = (await db.creditPayments.add({
      debtorId,
      amount,
      paymentMethod,
      staffId,
      staffName,
      notes: notes?.trim() || undefined,
      timestamp: now,
    })) as number

    const newTotalPaid = debtor.totalPaid + amount
    const newBalance = Math.max(0, debtor.totalOwed - newTotalPaid)

    await db.debtors.update(debtorId, {
      totalPaid: newTotalPaid,
      balance: newBalance,
      lastPaymentDate: now,
      updatedAt: now,
    })

    await db.auditLogs.add({
      staffId,
      staffName,
      action: 'debtor_payment',
      entity: 'debtor',
      entityId: debtorId,
      details: `Collected payment of ₦${amount.toLocaleString('en-NG')} from "${debtor.name}" via ${paymentMethod.toUpperCase()} (New balance: ₦${newBalance.toLocaleString('en-NG')})`,
      metadata: { debtorId, paymentId, amount, paymentMethod, newBalance },
      timestamp: now,
    })

    return (await db.creditPayments.get(paymentId))!
  })
}

/**
 * Retrieve comprehensive overview stats for all debtors.
 */
export async function getDebtorStats(): Promise<DebtorStats> {
  const debtors = await db.debtors.toArray()

  let totalOutstanding = 0
  let totalCreditGiven = 0
  let totalCollected = 0
  let activeDebtorsCount = 0

  for (const d of debtors) {
    totalOutstanding += d.balance
    totalCreditGiven += d.totalOwed
    totalCollected += d.totalPaid
    if (d.balance > 0) {
      activeDebtorsCount += 1
    }
  }

  return {
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    totalCreditGiven: Math.round(totalCreditGiven * 100) / 100,
    totalCollected: Math.round(totalCollected * 100) / 100,
    totalDebtors: debtors.length,
    activeDebtorsCount,
  }
}

/**
 * Fetch full profile of a debtor with all their credit sales and recorded payments.
 */
export async function getDebtorDetails(debtorId: number): Promise<DebtorDetails | null> {
  const debtor = await db.debtors.get(debtorId)
  if (!debtor) return null

  // Find sales that match debtor phone or name with paymentMethod == 'credit'
  const sales = await db.sales
    .filter((s) => {
      if (s.paymentMethod !== 'credit') return false
      if (debtor.phone && s.customerPhone && normalizePhone(s.customerPhone) === debtor.phone) {
        return true
      }
      return (s.customerName || '').toLowerCase() === debtor.name.toLowerCase()
    })
    .reverse()
    .sortBy('timestamp')

  const payments = await db.creditPayments
    .where('debtorId')
    .equals(debtorId)
    .reverse()
    .sortBy('timestamp')

  return {
    ...debtor,
    sales,
    payments,
  }
}
