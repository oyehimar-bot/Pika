import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import {
  getAllProductsWithStock,
  getInventoryValuation,
  getExpiringBatches,
  getTodaySalesSummary,
  searchReceipts,
  getComprehensiveSalesAnalytics,
} from '@/db'
import type {
  ProductWithStock,
  InventoryValuation,
  ExpiryWarning,
  AuditLog,
  BusinessMode,
  ReceiptSnapshot,
  ReceiptFilterOptions,
  SalesTimeframePreset,
  SalesAnalyticsResult,
} from '@/db'

/**
 * React hooks for live database queries.
 *
 * These hooks use Dexie's useLiveQuery to automatically re-render
 * components whenever the underlying IndexedDB data changes.
 */

/** Live query: all products with aggregated stock info */
export function useProducts(modeOverride?: BusinessMode): ProductWithStock[] | undefined {
  return useLiveQuery(() => getAllProductsWithStock(14, modeOverride), [modeOverride])
}

/** Live query: inventory valuation summary */
export function useInventoryValuation(modeOverride?: BusinessMode): InventoryValuation | undefined {
  return useLiveQuery(() => getInventoryValuation(modeOverride), [modeOverride])
}

/** Live query: batches expiring soon */
export function useExpiringBatches(daysAhead: number = 30): ExpiryWarning[] | undefined {
  return useLiveQuery(() => getExpiringBatches(daysAhead), [daysAhead])
}

/** Live query: today's sales summary */
export function useTodaySales() {
  return useLiveQuery(() => getTodaySalesSummary())
}

/** Live query: recent audit logs */
export function useRecentAuditLogs(limit: number = 50): AuditLog[] | undefined {
  return useLiveQuery(
    () =>
      db.auditLogs
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray(),
    [limit]
  )
}

/** Live query: product count */
export function useProductCount(): number | undefined {
  return useLiveQuery(() => db.products.filter((p) => p.isActive).count())
}

/** Live query: active batches for a specific product */
export function useProductBatches(productId: number | undefined) {
  return useLiveQuery(
    async () => {
      if (!productId) return []
      const batches = await db.batches
        .where('productId')
        .equals(productId)
        .toArray()
      return batches
        .filter((b) => b.isActive && b.remainingQty > 0)
        .sort(
          (a, b) =>
            new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime()
        )
    },
    [productId]
  )
}

/** Live query: search/filtered receipts history */
export function useReceipts(
  filters: ReceiptFilterOptions = {}
): ReceiptSnapshot[] | undefined {
  return useLiveQuery(
    () => searchReceipts(filters),
    [filters.query, filters.startDate?.toISOString(), filters.endDate?.toISOString(), filters.paymentMethod]
  )
}

/** Live query: comprehensive sales analytics (daily & monthly) */
export function useSalesAnalytics(
  preset: SalesTimeframePreset = 'this_month',
  customStart?: Date | null,
  customEnd?: Date | null
): SalesAnalyticsResult | undefined {
  return useLiveQuery(
    () => getComprehensiveSalesAnalytics(preset, customStart, customEnd),
    [preset, customStart?.toISOString(), customEnd?.toISOString()]
  )
}


