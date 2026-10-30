import { db } from './database'
import type { Product } from './models'
import { addBatch } from './fifoService'

/**
 * Product Service
 *
 * CRUD operations and helper utilities for products in the local database.
 */

export interface CreateProductInput {
  name: string
  sku: string
  category: string
  unit: string
  reorderLevel: number
  barcode?: string
  imageUrl?: string
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  isActive?: boolean
}

/**
 * Create a new product and record an audit log.
 */
export async function createProduct(
  input: CreateProductInput,
  staffId: string = 'admin',
  staffName: string = 'Admin'
): Promise<number> {
  const skuTrimmed = input.sku.trim().toUpperCase()

  // Verify SKU uniqueness among active products
  const existing = await db.products
    .where('sku')
    .equals(skuTrimmed)
    .first()

  if (existing && existing.isActive) {
    throw new Error(`A product with SKU "${skuTrimmed}" already exists.`)
  }

  const productId = (await db.products.add({
    name: input.name.trim(),
    sku: skuTrimmed,
    category: input.category.trim() || 'General',
    unit: input.unit.trim() || 'pcs',
    reorderLevel: Math.max(0, Number(input.reorderLevel) || 0),
    barcode: input.barcode?.trim() || '',
    imageUrl: input.imageUrl?.trim() || '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as number

  await db.auditLogs.add({
    staffId,
    staffName,
    action: 'product_created',
    entity: 'product',
    entityId: productId,
    details: `Product "${input.name}" created (SKU: ${skuTrimmed})`,
    metadata: { ...input, sku: skuTrimmed },
    timestamp: new Date(),
  })

  return productId
}

/**
 * Update an existing product and record an audit log.
 */
export async function updateProduct(
  id: number,
  input: UpdateProductInput,
  staffId: string = 'admin',
  staffName: string = 'Admin'
): Promise<void> {
  const product = await db.products.get(id)
  if (!product) {
    throw new Error(`Product with ID ${id} not found.`)
  }

  const updates: Partial<Product> = {
    updatedAt: new Date(),
  }

  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.sku !== undefined) updates.sku = input.sku.trim().toUpperCase()
  if (input.category !== undefined) updates.category = input.category.trim()
  if (input.unit !== undefined) updates.unit = input.unit.trim()
  if (input.reorderLevel !== undefined) {
    updates.reorderLevel = Math.max(0, Number(input.reorderLevel) || 0)
  }
  if (input.barcode !== undefined) updates.barcode = input.barcode.trim()
  if (input.imageUrl !== undefined) updates.imageUrl = input.imageUrl.trim()
  if (input.isActive !== undefined) updates.isActive = input.isActive

  await db.products.update(id, updates)

  await db.auditLogs.add({
    staffId,
    staffName,
    action: 'product_updated',
    entity: 'product',
    entityId: id,
    details: `Product "${updates.name || product.name}" updated`,
    metadata: { previous: product, updates },
    timestamp: new Date(),
  })
}

/**
 * Soft-delete or archive a product.
 */
export async function deleteProduct(
  id: number,
  staffId: string = 'admin',
  staffName: string = 'Admin'
): Promise<void> {
  const product = await db.products.get(id)
  if (!product) return

  await db.products.update(id, { isActive: false, updatedAt: new Date() })

  await db.auditLogs.add({
    staffId,
    staffName,
    action: 'product_deleted',
    entity: 'product',
    entityId: id,
    details: `Product "${product.name}" archived`,
    metadata: { sku: product.sku },
    timestamp: new Date(),
  })
}

/**
 * Helper to auto-generate a suggested SKU based on name and category.
 */
export function generateSuggestedSKU(name: string, category: string): string {
  const catCode = (category || 'GEN')
    .replace(/[^A-Za-z0-9]/g, '')
    .substring(0, 3)
    .toUpperCase()
  const nameCode = (name || 'PRD')
    .replace(/[^A-Za-z0-9]/g, '')
    .substring(0, 4)
    .toUpperCase()
  const rand = Math.floor(100 + Math.random() * 900)
  return `${catCode}-${nameCode}-${rand}`
}

/**
 * Helper to generate a random 12-digit barcode.
 */
export function generateBarcode(): string {
  let code = '20' // In-store prefix
  for (let i = 0; i < 10; i++) {
    code += Math.floor(Math.random() * 10).toString()
  }
  return code
}

/**
 * Populate realistic sample inventory for testing and demonstration.
 */
export async function seedSampleInventory(): Promise<void> {
  const productCount = await db.products.count()
  if (productCount > 0) return

  const now = new Date()
  const dayMs = 24 * 60 * 60 * 1000

  // 1. Arabica Coffee Beans (Multi-batch FIFO demonstration)
  const coffeeId = await createProduct({
    name: 'Arabica Signature Coffee Beans (1kg)',
    sku: 'BEV-COF-01',
    category: 'Beverages',
    unit: 'bag',
    reorderLevel: 8,
    barcode: '201948201938',
  })

  // Old batch: Received 20 days ago, costs ₦3,800, sells ₦6,000
  await addBatch({
    productId: coffeeId,
    batchNumber: 'LOT-COF-2026A',
    costPrice: 3800,
    sellingPrice: 6000,
    initialQty: 15,
    remainingQty: 4,
    expiryDate: new Date(now.getTime() + 45 * dayMs),
    receivedDate: new Date(now.getTime() - 20 * dayMs),
    supplier: 'Highland Roasters',
  })

  // New batch: Received 3 days ago at higher cost ₦4,200, sells ₦6,500
  await addBatch({
    productId: coffeeId,
    batchNumber: 'LOT-COF-2026B',
    costPrice: 4200,
    sellingPrice: 6500,
    initialQty: 25,
    remainingQty: 25,
    expiryDate: new Date(now.getTime() + 120 * dayMs),
    receivedDate: new Date(now.getTime() - 3 * dayMs),
    supplier: 'Highland Roasters',
  })

  // 2. Fresh Whole Milk (Near-Expiry Alert demonstration)
  const milkId = await createProduct({
    name: 'Fresh Pasture Whole Milk (1L)',
    sku: 'DAI-MLK-02',
    category: 'Dairy',
    unit: 'bottle',
    reorderLevel: 15,
    barcode: '204918274910',
  })

  // Batch expiring in 4 days!
  await addBatch({
    productId: milkId,
    batchNumber: 'LOT-MLK-901',
    costPrice: 650,
    sellingPrice: 1100,
    initialQty: 30,
    remainingQty: 9,
    expiryDate: new Date(now.getTime() + 4 * dayMs),
    receivedDate: new Date(now.getTime() - 6 * dayMs),
    supplier: 'Meadow Farms Dairy',
  })

  // 3. Organic Rolled Oats (Low Stock warning demonstration)
  const oatsId = await createProduct({
    name: 'Organic Rolled Oats (1kg)',
    sku: 'PAN-OAT-03',
    category: 'Pantry',
    unit: 'pack',
    reorderLevel: 10,
    barcode: '209384019283',
  })

  // Only 3 left, below reorder level of 10!
  await addBatch({
    productId: oatsId,
    batchNumber: 'LOT-OAT-104',
    costPrice: 1200,
    sellingPrice: 2000,
    initialQty: 20,
    remainingQty: 3,
    expiryDate: new Date(now.getTime() + 180 * dayMs),
    receivedDate: new Date(now.getTime() - 40 * dayMs),
    supplier: 'Green Valley Naturals',
  })

  // 4. Artisanal Sourdough Bread (Perishable)
  const breadId = await createProduct({
    name: 'Artisanal Sourdough Loaf (750g)',
    sku: 'BAK-SRD-04',
    category: 'Bakery',
    unit: 'loaf',
    reorderLevel: 5,
    barcode: '208192837461',
  })

  await addBatch({
    productId: breadId,
    batchNumber: 'LOT-SRD-502',
    costPrice: 800,
    sellingPrice: 1600,
    initialQty: 18,
    remainingQty: 12,
    expiryDate: new Date(now.getTime() + 2 * dayMs),
    receivedDate: new Date(now.getTime() - 1 * dayMs),
    supplier: 'Crust & Crumb Bakery',
  })

  // 5. Olive Oil Extra Virgin (500ml)
  const oilId = await createProduct({
    name: 'Extra Virgin Olive Oil (500ml)',
    sku: 'PAN-OIL-05',
    category: 'Pantry',
    unit: 'bottle',
    reorderLevel: 6,
    barcode: '207182930491',
  })

  await addBatch({
    productId: oilId,
    batchNumber: 'LOT-OIL-301',
    costPrice: 3500,
    sellingPrice: 5500,
    initialQty: 12,
    remainingQty: 12,
    expiryDate: new Date(now.getTime() + 360 * dayMs),
    receivedDate: new Date(now.getTime() - 10 * dayMs),
    supplier: 'Mediterranean Imports',
  })

  // ─── Non-Perishable Durable Goods (Without Expiry Date) ───────────────────

  // 6. Logitech MX Master 3S Wireless Mouse (Electronics)
  const mouseId = await createProduct({
    name: 'Logitech MX Master 3S Wireless Mouse',
    sku: 'ELE-LOG-01',
    category: 'Electronics',
    unit: 'pcs',
    reorderLevel: 5,
    barcode: '109283746501',
  })

  await addBatch({
    productId: mouseId,
    batchNumber: 'LOT-LOG-101',
    costPrice: 45000,
    sellingPrice: 65000,
    initialQty: 15,
    remainingQty: 15,
    expiryDate: null,
    receivedDate: new Date(now.getTime() - 12 * dayMs),
    supplier: 'Apex Tech Wholesalers',
  })

  // 7. Heavy Duty Mechanic Toolkit 120-Piece (Hardware)
  const toolkitId = await createProduct({
    name: 'Heavy Duty Mechanic Toolkit 120-Piece',
    sku: 'HRD-TOOL-02',
    category: 'Hardware',
    unit: 'set',
    reorderLevel: 3,
    barcode: '108273645192',
  })

  await addBatch({
    productId: toolkitId,
    batchNumber: 'LOT-HRD-201',
    costPrice: 32000,
    sellingPrice: 48000,
    initialQty: 8,
    remainingQty: 8,
    expiryDate: null,
    receivedDate: new Date(now.getTime() - 15 * dayMs),
    supplier: 'Industrial Spares Ltd',
  })

  // 8. Premium Cotton Unisex Oversized Hoodie (Boutique)
  const hoodieId = await createProduct({
    name: 'Premium Cotton Unisex Oversized Hoodie',
    sku: 'APP-HOD-03',
    category: 'Boutique',
    unit: 'pcs',
    reorderLevel: 10,
    barcode: '107382910482',
  })

  await addBatch({
    productId: hoodieId,
    batchNumber: 'LOT-APP-301',
    costPrice: 8500,
    sellingPrice: 15000,
    initialQty: 25,
    remainingQty: 25,
    expiryDate: null,
    receivedDate: new Date(now.getTime() - 7 * dayMs),
    supplier: 'Urban Stitch Apparel',
  })

  // 9. Stainless Steel Thermal Vacuum Flask 1.5L (Household)
  const flaskId = await createProduct({
    name: 'Stainless Steel Thermal Vacuum Flask 1.5L',
    sku: 'HSE-FLK-04',
    category: 'Household',
    unit: 'pcs',
    reorderLevel: 4,
    barcode: '106294710381',
  })

  await addBatch({
    productId: flaskId,
    batchNumber: 'LOT-FLK-401',
    costPrice: 7000,
    sellingPrice: 12500,
    initialQty: 20,
    remainingQty: 20,
    expiryDate: null,
    receivedDate: new Date(now.getTime() - 5 * dayMs),
    supplier: 'KitchenCraft Imports',
  })
}
