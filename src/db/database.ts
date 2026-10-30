import Dexie, { type EntityTable } from 'dexie'
import type { Product, Batch, Sale, SaleItem, AuditLog, Staff, AppSetting, ReceiptSnapshot } from './models'

/**
 * PikaDatabase — Local-first IndexedDB schema via Dexie.js
 *
 * Design principles:
 * - All data lives on the user's device (IndexedDB)
 * - Schema uses compound & multi-entry indexes for fast queries
 * - Versioned migrations for safe schema evolution
 */
export class PikaDatabase extends Dexie {
  products!: EntityTable<Product, 'id'>
  batches!: EntityTable<Batch, 'id'>
  sales!: EntityTable<Sale, 'id'>
  saleItems!: EntityTable<SaleItem, 'id'>
  auditLogs!: EntityTable<AuditLog, 'id'>
  staff!: EntityTable<Staff, 'id'>
  appSettings!: EntityTable<AppSetting, 'key'>
  receipts!: EntityTable<ReceiptSnapshot, 'id'>

  constructor() {
    super('PikaDB')

    this.version(1).stores({
      // Products — indexed by SKU, barcode, category for fast lookups
      products: '++id, sku, barcode, category, name, isActive, createdAt',

      // Batches — indexed by productId for FIFO ordering, expiry tracking
      batches: '++id, productId, batchNumber, expiryDate, receivedDate, isActive, createdAt',

      // Sales — indexed by transactionId, staffId, timestamp for reporting
      sales: '++id, transactionId, staffId, paymentMethod, timestamp',

      // Sale Items — indexed by saleId for joins, productId for analytics
      saleItems: '++id, saleId, productId, batchId',

      // Audit Logs — indexed by action, entity, staffId, timestamp for filtering
      auditLogs: '++id, staffId, action, entity, entityId, timestamp',

      // Staff — indexed by PIN for fast auth lookups
      staff: '++id, pin, role, isActive',

      // App Settings — key/value store for business mode, store preferences
      appSettings: 'key',
    })

    this.version(2).stores({
      // Receipts — indexed for receipt history search, date filtering, and thermal reprinting
      receipts: '++id, receiptNumber, saleId, transactionId, staffId, paymentMethod, timestamp',
    })
  }
}

/** Singleton database instance */
export const db = new PikaDatabase()

/**
 * Initialize database with seed data if empty.
 * Called once on app startup.
 */
export async function initializeDatabase(): Promise<void> {
  const staffCount = await db.staff.count()
  if (staffCount === 0) {
    // Seed default staff roles for fast PIN switching
    await db.staff.bulkAdd([
      {
        name: 'Admin',
        pin: '0000',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
      },
      {
        name: 'Store Manager',
        pin: '5678',
        role: 'manager',
        isActive: true,
        createdAt: new Date(),
      },
      {
        name: 'Cashier 1',
        pin: '1234',
        role: 'cashier',
        isActive: true,
        createdAt: new Date(),
      },
    ])

    await db.auditLogs.add({
      staffId: 'system',
      staffName: 'System',
      action: 'settings_changed',
      entity: 'system',
      details: 'Database initialized with Admin, Manager, and Cashier profiles',
      timestamp: new Date(),
    })
  }
}

/**
 * Clear all data from the database.
 * USE WITH CAUTION — intended for development/testing only.
 */
export async function clearDatabase(): Promise<void> {
  await db.transaction(
    'rw',
    [db.products, db.batches, db.sales, db.saleItems, db.auditLogs, db.staff, db.appSettings, db.receipts],
    async () => {
      await db.products.clear()
      await db.batches.clear()
      await db.sales.clear()
      await db.saleItems.clear()
      await db.auditLogs.clear()
      await db.staff.clear()
      await db.appSettings.clear()
      await db.receipts.clear()
    }
  )
}

