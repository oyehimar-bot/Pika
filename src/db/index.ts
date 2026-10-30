/**
 * Pika Database — Public API
 *
 * Re-exports everything needed by the application layer.
 */

// Database instance and lifecycle
export { db, initializeDatabase, clearDatabase } from './database'

// Data models and types
export type {
  Product,
  Batch,
  Sale,
  SaleItem,
  AuditLog,
  Staff,
  PaymentMethod,
  AuditAction,
  AuditEntity,
  StaffRole,
  ProductWithStock,
  BatchWithProduct,
  SaleWithItems,
  CartItem,
  BatchAllocation,
  FIFODeductionResult,
  StockAdjustmentResult,
  ExpiryWarning,
} from './models'

// FIFO inventory engine
export {
  calculateFIFOAllocation,
  commitFIFODeduction,
  addBatch,
  adjustBatchStock,
  getExpiringBatches,
  flagExpiredBatches,
  getProductWithStock,
  getAllProductsWithStock,
  getInventoryValuation,
  generateTransactionId,
  generateBatchNumber,
} from './fifoService'
export type { InventoryValuation } from './fifoService'

// Sales service
export {
  processSale,
  getSaleWithItems,
  getSalesByDateRange,
  getTodaySalesSummary,
  voidSale,
} from './salesService'
export type { ProcessSaleInput, ProcessSaleResult } from './salesService'

