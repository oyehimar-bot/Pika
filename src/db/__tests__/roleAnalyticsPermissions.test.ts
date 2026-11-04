import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from '../database'
import { addBatch } from '../fifoService'
import { processSale } from '../salesService'
import { getComprehensiveSalesAnalytics } from '../salesAnalyticsService'
import type { CartItem, Staff } from '../models'

describe('Role-Based Sales Analytics Permissions & Isolation', () => {
  beforeEach(async () => {
    await db.products.clear()
    await db.batches.clear()
    await db.sales.clear()
    await db.saleItems.clear()
    await db.receipts.clear()
    await db.auditLogs.clear()
    await db.staff.clear()

    // Seed staff profiles
    await db.staff.bulkAdd([
      {
        id: 1,
        name: 'Super Admin',
        pin: '0000',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: 'Shift Cashier',
        pin: '1234',
        role: 'cashier',
        isActive: true,
        createdAt: new Date(),
      },
      {
        id: 3,
        name: 'Store Manager',
        pin: '5678',
        role: 'manager',
        isActive: true,
        createdAt: new Date(),
      },
    ])
  })

  it('correctly distinguishes admin role from non-admin cashier and manager roles', async () => {
    const adminStaff = await db.staff.get(1)
    const cashierStaff = await db.staff.get(2)
    const managerStaff = await db.staff.get(3)

    expect(adminStaff?.role).toBe('admin')
    expect(cashierStaff?.role).toBe('cashier')
    expect(managerStaff?.role).toBe('manager')

    const isAdmin = (staff?: Staff | null) => staff?.role === 'admin'
    expect(isAdmin(adminStaff)).toBe(true)
    expect(isAdmin(cashierStaff)).toBe(false)
    expect(isAdmin(managerStaff)).toBe(false)
  })

  it('restricts non-admin staff strictly to Today sales volume and transaction count, hiding profit margins', async () => {
    const prodId = (await db.products.add({
      name: 'Samsung Galaxy A15',
      sku: 'SAM-A15-128',
      category: 'Smartphones',
      unit: 'pcs',
      reorderLevel: 3,
      barcode: '99887766',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as number

    await addBatch({
      productId: prodId,
      batchNumber: 'LOT-SAM-01',
      costPrice: 150000,
      sellingPrice: 195000,
      initialQty: 10,
      remainingQty: 10,
      expiryDate: null,
      receivedDate: new Date(),
    })

    const cartItem: CartItem = {
      productId: prodId,
      productName: 'Samsung Galaxy A15',
      sku: 'SAM-A15-128',
      quantity: 2, // Revenue: 390,000, Cost: 300,000, Profit: 90,000
      unitPrice: 195000,
      maxAvailable: 10,
      batches: [],
    }

    await processSale({
      cartItems: [cartItem],
      paymentMethod: 'card',
      discount: 0,
      tax: 0,
      staffId: '2',
      staffName: 'Shift Cashier',
    })

    // Helper simulating role-based analytics filter
    function filterAnalyticsForRole(
      analytics: Awaited<ReturnType<typeof getComprehensiveSalesAnalytics>>,
      role: 'admin' | 'cashier' | 'manager'
    ) {
      if (role === 'admin') {
        return {
          canViewHistorical: true,
          canViewNetProfit: true,
          canExportCSV: true,
          canViewMonthlyCharts: true,
          revenue: analytics.kpis.totalRevenue,
          orders: analytics.kpis.transactionCount,
          netProfit: analytics.kpis.netProfit,
          profitMargin: analytics.kpis.profitMargin,
          fifoCost: analytics.kpis.totalCost,
        }
      }

      // Non-admin (Cashier / Staff): Only Today's sales volume and transaction count
      return {
        canViewHistorical: false,
        canViewNetProfit: false,
        canExportCSV: false,
        canViewMonthlyCharts: false,
        revenue: analytics.todaySummary.totalRevenue,
        orders: analytics.todaySummary.transactionCount,
        netProfit: null,
        profitMargin: null,
        fifoCost: null,
      }
    }

    const rawAnalytics = await getComprehensiveSalesAnalytics('today')

    // Admin view has full figures
    const adminView = filterAnalyticsForRole(rawAnalytics, 'admin')
    expect(adminView.canViewHistorical).toBe(true)
    expect(adminView.canViewNetProfit).toBe(true)
    expect(adminView.canExportCSV).toBe(true)
    expect(adminView.revenue).toBe(390000)
    expect(adminView.orders).toBe(1)
    expect(adminView.netProfit).toBe(90000)
    expect(adminView.profitMargin).toBe(23.1)
    expect(adminView.fifoCost).toBe(300000)

    // Cashier view masks profit and restricts historical
    const cashierView = filterAnalyticsForRole(rawAnalytics, 'cashier')
    expect(cashierView.canViewHistorical).toBe(false)
    expect(cashierView.canViewNetProfit).toBe(false)
    expect(cashierView.canExportCSV).toBe(false)
    expect(cashierView.revenue).toBe(390000)
    expect(cashierView.orders).toBe(1)
    expect(cashierView.netProfit).toBeNull()
    expect(cashierView.profitMargin).toBeNull()
    expect(cashierView.fifoCost).toBeNull()
  })
})
