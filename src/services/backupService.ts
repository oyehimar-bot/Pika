import { db } from '@/db'

export interface BackupPayload {
  version: string
  exportedAt: string
  tables: {
    products: unknown[]
    batches: unknown[]
    sales: unknown[]
    saleItems: unknown[]
    auditLogs: unknown[]
    staff: unknown[]
  }
}

/**
 * Dump complete local IndexedDB database into a downloadable JSON file.
 */
export async function exportDatabaseToJSON(): Promise<void> {
  const [products, batches, sales, saleItems, auditLogs, staff] =
    await Promise.all([
      db.products.toArray(),
      db.batches.toArray(),
      db.sales.toArray(),
      db.saleItems.toArray(),
      db.auditLogs.toArray(),
      db.staff.toArray(),
    ])

  const payload: BackupPayload = {
    version: '0.1.0',
    exportedAt: new Date().toISOString(),
    tables: {
      products,
      batches,
      sales,
      saleItems,
      auditLogs,
      staff,
    },
  }

  const jsonStr = JSON.stringify(payload, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const dateStr = new Date().toISOString().slice(0, 10)
  downloadBlob(blob, `pika-backup-${dateStr}.json`)

  await db.auditLogs.add({
    staffId: 'system',
    staffName: 'Admin',
    action: 'data_export',
    entity: 'system',
    details: `Full JSON database backup generated (${products.length} products, ${batches.length} batches, ${sales.length} sales)`,
    timestamp: new Date(),
  })
}

/**
 * Export specific entities to formatted CSV file.
 */
export async function exportTableToCSV(
  type: 'products' | 'batches' | 'sales' | 'audit'
): Promise<void> {
  let csvContent = ''
  let filename = ''

  if (type === 'products') {
    const products = await db.products.toArray()
    filename = `pika-products-${new Date().toISOString().slice(0, 10)}.csv`
    const headers = [
      'ID',
      'Name',
      'SKU',
      'Category',
      'Unit',
      'ReorderLevel',
      'Barcode',
      'Active',
      'CreatedAt',
    ]
    const rows = products.map((p) => [
      p.id,
      escapeCSV(p.name),
      escapeCSV(p.sku),
      escapeCSV(p.category),
      p.unit,
      p.reorderLevel,
      p.barcode,
      p.isActive ? 'YES' : 'NO',
      new Date(p.createdAt).toISOString(),
    ])
    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  } else if (type === 'batches') {
    const batches = await db.batches.toArray()
    filename = `pika-batches-${new Date().toISOString().slice(0, 10)}.csv`
    const headers = [
      'BatchID',
      'ProductID',
      'BatchNumber',
      'CostPrice',
      'SellingPrice',
      'InitialQty',
      'RemainingQty',
      'ExpiryDate',
      'ReceivedDate',
      'Supplier',
      'Active',
    ]
    const rows = batches.map((b) => [
      b.id,
      b.productId,
      escapeCSV(b.batchNumber),
      b.costPrice,
      b.sellingPrice,
      b.initialQty,
      b.remainingQty,
      b.expiryDate ? new Date(b.expiryDate).toISOString() : '',
      new Date(b.receivedDate).toISOString(),
      escapeCSV(b.supplier || ''),
      b.isActive ? 'YES' : 'NO',
    ])
    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  } else if (type === 'sales') {
    const sales = await db.sales.toArray()
    filename = `pika-sales-${new Date().toISOString().slice(0, 10)}.csv`
    const headers = [
      'SaleID',
      'TransactionID',
      'Subtotal',
      'Discount',
      'Tax',
      'TotalAmount',
      'PaymentMethod',
      'StaffName',
      'CustomerName',
      'Timestamp',
    ]
    const rows = sales.map((s) => [
      s.id,
      s.transactionId,
      s.subtotal,
      s.discount,
      s.tax,
      s.totalAmount,
      s.paymentMethod,
      escapeCSV(s.staffName),
      escapeCSV(s.customerName || ''),
      new Date(s.timestamp).toISOString(),
    ])
    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  } else if (type === 'audit') {
    const logs = await db.auditLogs.toArray()
    filename = `pika-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    const headers = [
      'LogID',
      'StaffName',
      'Action',
      'Entity',
      'EntityID',
      'Details',
      'Timestamp',
    ]
    const rows = logs.map((l) => [
      l.id,
      escapeCSV(l.staffName),
      l.action,
      l.entity,
      l.entityId || '',
      escapeCSV(l.details),
      new Date(l.timestamp).toISOString(),
    ])
    csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)

  await db.auditLogs.add({
    staffId: 'system',
    staffName: 'Admin',
    action: 'data_export',
    entity: 'system',
    details: `Exported ${type} table to CSV format`,
    timestamp: new Date(),
  })
}

/**
 * Restore database from an uploaded JSON backup file.
 */
export async function importDatabaseFromJSON(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString) as BackupPayload

  if (!data.tables || !data.version) {
    throw new Error('Invalid backup file format: missing tables or version header.')
  }

  await db.transaction(
    'rw',
    [db.products, db.batches, db.sales, db.saleItems, db.auditLogs, db.staff],
    async () => {
      // Clear current data
      await Promise.all([
        db.products.clear(),
        db.batches.clear(),
        db.sales.clear(),
        db.saleItems.clear(),
        db.auditLogs.clear(),
        db.staff.clear(),
      ])

      // Restore tables
      if (Array.isArray(data.tables.products) && data.tables.products.length > 0) {
        await db.products.bulkAdd(data.tables.products as any)
      }
      if (Array.isArray(data.tables.batches) && data.tables.batches.length > 0) {
        await db.batches.bulkAdd(data.tables.batches as any)
      }
      if (Array.isArray(data.tables.sales) && data.tables.sales.length > 0) {
        await db.sales.bulkAdd(data.tables.sales as any)
      }
      if (Array.isArray(data.tables.saleItems) && data.tables.saleItems.length > 0) {
        await db.saleItems.bulkAdd(data.tables.saleItems as any)
      }
      if (Array.isArray(data.tables.staff) && data.tables.staff.length > 0) {
        await db.staff.bulkAdd(data.tables.staff as any)
      }
      if (Array.isArray(data.tables.auditLogs) && data.tables.auditLogs.length > 0) {
        await db.auditLogs.bulkAdd(data.tables.auditLogs as any)
      }

      await db.auditLogs.add({
        staffId: 'system',
        staffName: 'Admin',
        action: 'settings_changed',
        entity: 'system',
        details: `Database restored from backup archive created at ${data.exportedAt}`,
        timestamp: new Date(),
      })
    }
  )
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
