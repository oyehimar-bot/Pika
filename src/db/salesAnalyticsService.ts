import { db } from './database'
import type { PaymentMethod, Sale } from './models'

export type SalesTimeframePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_30_days'
  | 'custom'

export interface SalesKPIs {
  totalRevenue: number
  totalCost: number
  netProfit: number
  profitMargin: number // e.g. 25.4%
  transactionCount: number
  itemsSold: number
  averageOrderValue: number
}

export interface DailyBreakdownItem {
  dateKey: string // YYYY-MM-DD
  dateLabel: string // e.g. "Fri, Oct 30"
  dayName: string // e.g. "Friday"
  revenue: number
  cost: number
  profit: number
  profitMargin: number
  transactionCount: number
  topPaymentMethod?: string
}

export interface MonthlyBreakdownItem {
  monthKey: string // YYYY-MM
  monthLabel: string // e.g. "October 2026"
  revenue: number
  cost: number
  profit: number
  profitMargin: number
  transactionCount: number
  averageDailyRevenue: number
}

export interface PaymentMethodShare {
  method: PaymentMethod
  label: string
  count: number
  revenue: number
  percentage: number
}

export interface SalesAnalyticsResult {
  preset: SalesTimeframePreset
  startDate: Date
  endDate: Date
  kpis: SalesKPIs
  paymentBreakdown: PaymentMethodShare[]
  dailyBreakdown: DailyBreakdownItem[]
  monthlyBreakdown: MonthlyBreakdownItem[]
  todaySummary: SalesKPIs
  yesterdaySummary: SalesKPIs
  currentMonthSummary: SalesKPIs
  previousMonthSummary: SalesKPIs
}

/**
 * Helper to determine date boundaries for a given preset
 */
export function getDateRangeForPreset(
  preset: SalesTimeframePreset,
  customStart?: Date | null,
  customEnd?: Date | null
): { start: Date; end: Date } {
  const now = new Date()

  if (preset === 'custom' && customStart && customEnd) {
    const s = new Date(customStart)
    s.setHours(0, 0, 0, 0)
    const e = new Date(customEnd)
    e.setHours(23, 59, 59, 999)
    return { start: s, end: e }
  }

  const start = new Date(now)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break

    case 'yesterday': {
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      break
    }

    case 'this_week': {
      // Start from Monday of the current week (or 7 days ago)
      const day = start.getDay() // 0 = Sun, 1 = Mon
      const diff = start.getDate() - day + (day === 0 ? -6 : 1)
      start.setDate(diff)
      start.setHours(0, 0, 0, 0)
      break
    }

    case 'this_month': {
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    }

    case 'last_30_days':
    default: {
      start.setDate(start.getDate() - 29)
      start.setHours(0, 0, 0, 0)
      break
    }
  }

  return { start, end }
}

/**
 * Computes comprehensive sales analytics from IndexedDB
 */
export async function getComprehensiveSalesAnalytics(
  preset: SalesTimeframePreset = 'this_month',
  customStart?: Date | null,
  customEnd?: Date | null
): Promise<SalesAnalyticsResult> {
  const { start, end } = getDateRangeForPreset(preset, customStart, customEnd)

  // Fetch all sales and sale items
  const [allSales, allSaleItems] = await Promise.all([
    db.sales.toArray(),
    db.saleItems.toArray(),
  ])

  // Group line items by saleId for instant FIFO cost lookup
  const itemsBySaleId = new Map<number, typeof allSaleItems>()
  for (const item of allSaleItems) {
    const list = itemsBySaleId.get(item.saleId) || []
    list.push(item)
    itemsBySaleId.set(item.saleId, list)
  }

  // Helper to compute KPIs for any arbitrary set of sales
  const computeKPIs = (salesSubset: Sale[]): SalesKPIs => {
    let totalRevenue = 0
    let totalCost = 0
    let itemsSold = 0

    for (const sale of salesSubset) {
      totalRevenue += sale.totalAmount
      const items = itemsBySaleId.get(sale.id!) || []
      for (const it of items) {
        itemsSold += it.quantity
        totalCost += (it.unitCostPrice || 0) * it.quantity
      }
    }

    totalRevenue = Math.round(totalRevenue * 100) / 100
    totalCost = Math.round(totalCost * 100) / 100
    const netProfit = Math.round((totalRevenue - totalCost) * 100) / 100
    const profitMargin =
      totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0
    const transactionCount = salesSubset.length
    const averageOrderValue =
      transactionCount > 0 ? Math.round((totalRevenue / transactionCount) * 100) / 100 : 0

    return {
      totalRevenue,
      totalCost,
      netProfit,
      profitMargin,
      transactionCount,
      itemsSold,
      averageOrderValue,
    }
  }

  // Filter sales within the selected target range
  const filteredSales = allSales.filter((s) => {
    const t = new Date(s.timestamp).getTime()
    return t >= start.getTime() && t <= end.getTime()
  })

  // Selected range KPIs
  const rangeKPIs = computeKPIs(filteredSales)

  // Today boundaries
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  // Yesterday boundaries
  const yestStart = new Date(todayStart)
  yestStart.setDate(yestStart.getDate() - 1)
  const yestEnd = new Date(todayEnd)
  yestEnd.setDate(yestEnd.getDate() - 1)

  // Current Month boundaries
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // Previous Month boundaries
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  const todaySales = allSales.filter((s) => {
    const t = new Date(s.timestamp).getTime()
    return t >= todayStart.getTime() && t <= todayEnd.getTime()
  })

  const yesterdaySales = allSales.filter((s) => {
    const t = new Date(s.timestamp).getTime()
    return t >= yestStart.getTime() && t <= yestEnd.getTime()
  })

  const currentMonthSales = allSales.filter((s) => {
    const t = new Date(s.timestamp).getTime()
    return t >= thisMonthStart.getTime() && t <= thisMonthEnd.getTime()
  })

  const previousMonthSales = allSales.filter((s) => {
    const t = new Date(s.timestamp).getTime()
    return t >= lastMonthStart.getTime() && t <= lastMonthEnd.getTime()
  })

  const todaySummary = computeKPIs(todaySales)
  const yesterdaySummary = computeKPIs(yesterdaySales)
  const currentMonthSummary = computeKPIs(currentMonthSales)
  const previousMonthSummary = computeKPIs(previousMonthSales)

  // Payment methods breakdown for the selected range
  const paymentCounts: Record<PaymentMethod, { count: number; revenue: number }> = {
    cash: { count: 0, revenue: 0 },
    transfer: { count: 0, revenue: 0 },
    card: { count: 0, revenue: 0 },
  }

  for (const s of filteredSales) {
    const method = s.paymentMethod as PaymentMethod
    if (paymentCounts[method]) {
      paymentCounts[method].count += 1
      paymentCounts[method].revenue += s.totalAmount
    } else {
      // In case of any legacy record
      paymentCounts.cash.count += 1
      paymentCounts.cash.revenue += s.totalAmount
    }
  }

  const paymentLabels: Record<PaymentMethod, string> = {
    cash: 'Cash',
    transfer: 'Bank Transfer',
    card: 'POS / Card',
  }

  const paymentBreakdown: PaymentMethodShare[] = (
    Object.keys(paymentCounts) as PaymentMethod[]
  ).map((method) => {
    const data = paymentCounts[method]
    const percentage =
      rangeKPIs.totalRevenue > 0
        ? Math.round((data.revenue / rangeKPIs.totalRevenue) * 1000) / 10
        : 0
    return {
      method,
      label: paymentLabels[method],
      count: data.count,
      revenue: Math.round(data.revenue * 100) / 100,
      percentage,
    }
  })

  // Day-by-Day historical breakdown
  // Groups filtered sales by date string YYYY-MM-DD
  const dailyMap = new Map<string, Sale[]>()
  for (const s of filteredSales) {
    const dStr = new Date(s.timestamp).toISOString().slice(0, 10)
    const list = dailyMap.get(dStr) || []
    list.push(s)
    dailyMap.set(dStr, list)
  }

  const dailyBreakdown: DailyBreakdownItem[] = Array.from(dailyMap.entries())
    .map(([dateKey, daySales]) => {
      const kpis = computeKPIs(daySales)
      const d = new Date(dateKey + 'T12:00:00Z')
      const dateLabel = d.toLocaleDateString('en-NG', {
        month: 'short',
        day: 'numeric',
      })
      const dayName = d.toLocaleDateString('en-NG', { weekday: 'short' })

      // Determine top payment method for that day
      const methodCounts: Record<string, number> = {}
      for (const sale of daySales) {
        methodCounts[sale.paymentMethod] = (methodCounts[sale.paymentMethod] || 0) + 1
      }
      let topMethod = 'Cash'
      let maxCount = 0
      for (const [m, count] of Object.entries(methodCounts)) {
        if (count > maxCount) {
          maxCount = count
          topMethod = m === 'card' ? 'Card' : m === 'transfer' ? 'Transfer' : 'Cash'
        }
      }

      return {
        dateKey,
        dateLabel,
        dayName,
        revenue: kpis.totalRevenue,
        cost: kpis.totalCost,
        profit: kpis.netProfit,
        profitMargin: kpis.profitMargin,
        transactionCount: kpis.transactionCount,
        topPaymentMethod: topMethod,
      }
    })
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))

  // Month-by-Month comparative summary (all time or last 12 months)
  const monthlyMap = new Map<string, Sale[]>()
  for (const s of allSales) {
    const mStr = new Date(s.timestamp).toISOString().slice(0, 7) // YYYY-MM
    const list = monthlyMap.get(mStr) || []
    list.push(s)
    monthlyMap.set(mStr, list)
  }

  const monthlyBreakdown: MonthlyBreakdownItem[] = Array.from(monthlyMap.entries())
    .map(([monthKey, mSales]) => {
      const kpis = computeKPIs(mSales)
      const [year, month] = monthKey.split('-').map(Number)
      const d = new Date(year, month - 1, 1)
      const monthLabel = d.toLocaleDateString('en-NG', {
        month: 'long',
        year: 'numeric',
      })

      const daysInMonth = new Date(year, month, 0).getDate()
      const averageDailyRevenue =
        daysInMonth > 0 ? Math.round((kpis.totalRevenue / daysInMonth) * 100) / 100 : 0

      return {
        monthKey,
        monthLabel,
        revenue: kpis.totalRevenue,
        cost: kpis.totalCost,
        profit: kpis.netProfit,
        profitMargin: kpis.profitMargin,
        transactionCount: kpis.transactionCount,
        averageDailyRevenue,
      }
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey))

  return {
    preset,
    startDate: start,
    endDate: end,
    kpis: rangeKPIs,
    paymentBreakdown,
    dailyBreakdown,
    monthlyBreakdown,
    todaySummary,
    yesterdaySummary,
    currentMonthSummary,
    previousMonthSummary,
  }
}

