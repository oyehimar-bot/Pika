import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db'
import {
  getAllProductsWithStock,
  getInventoryValuation,
  getExpiringBatches,
  getTodaySalesSummary,
} from '@/db'
import type {
  ProductWithStock,
  InventoryValuation,
  ExpiryWarning,
  AuditLog,
} from '@/db'

/**
 * React hooks for live database queries.
 *
 * These hooks use Dexie's useLiveQuery to automatically re-render
 * components whenever the underlying IndexedDB data changes.
 */

/** Live query: all products with aggregated stock info */
export function useProducts(): ProductWithStock[] | undefined {
  return useLiveQuery(() => getAllProductsWithStock())
}

/** Live query: inventory valuation summary */
export function useInventoryValuation(): InventoryValuation | undefined {
  return useLiveQuery(() => getInventoryValuation())
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

