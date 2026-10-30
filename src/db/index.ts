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
  BusinessMode,
  AppSetting,
  ReceiptSnapshot,
  ReceiptItemSnapshot,
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

// Product service
export {
  createProduct,
  updateProduct,
  deleteProduct,
  generateSuggestedSKU,
  generateBarcode,
  seedSampleInventory,
} from './productService'
export type { CreateProductInput, UpdateProductInput } from './productService'

// Receipt service
export {
  getAllReceipts,
  getReceiptById,
  searchReceipts,
  convertReceiptToSaleWithItems,
  exportReceiptsToCSV,
  syncHistoricalReceipts,
} from './receiptService'
export type { ReceiptFilterOptions } from './receiptService'

// Sales Analytics service
export {
  getComprehensiveSalesAnalytics,
  getDateRangeForPreset,
} from './salesAnalyticsService'
export type {
  SalesTimeframePreset,
  SalesKPIs,
  DailyBreakdownItem,
  MonthlyBreakdownItem,
  PaymentMethodShare,
  SalesAnalyticsResult,
} from './salesAnalyticsService'



