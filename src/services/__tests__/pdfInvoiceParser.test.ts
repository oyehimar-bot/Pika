import { describe, it, expect } from 'vitest'
import { parseInvoiceText } from '../pdfInvoiceParser'

describe('Smart Invoice Parser Engine', () => {
  it('extracts metadata and line items from standard SME invoice text', () => {
    const invoiceSample = `
INVOICE
Invoice #: INV-2026-8819
Date: 2026-10-25
Supplier: Mega Wholesale Distributors Lagos
Total: ₦112,250.00

Description                       Qty    Unit Price    Total
Paracetamol 500mg Tablets 100s    20     ₦450.00       ₦9,000.00
Vitamin C 1000mg Effervescent     35     ₦1,550.00     ₦54,250.00
Amoxicillin 500mg Capsules        25     ₦1,960.00     ₦49,000.00
    `

    const result = parseInvoiceText(invoiceSample)

    expect(result.invoiceNumber).toBe('INV-2026-8819')
    expect(result.supplierName).toContain('Mega Wholesale Distributors')
    expect(result.invoiceDate).toBe('2026-10-25')
    expect(result.totalAmount).toBe(112250)
    expect(result.items.length).toBe(3)

    const [item1, item2, item3] = result.items
    expect(item1.name).toContain('Paracetamol 500mg')
    expect(item1.quantity).toBe(20)
    expect(item1.unitCostPrice).toBe(450)
    expect(item1.lineTotal).toBe(9000)
    expect(item1.suggestedSellingPrice).toBe(Math.round(450 * 1.3))

    expect(item2.name).toContain('Vitamin C')
    expect(item2.quantity).toBe(35)
    expect(item2.unitCostPrice).toBe(1550)

    expect(item3.name).toContain('Amoxicillin 500mg')
    expect(item3.quantity).toBe(25)
    expect(item3.unitCostPrice).toBe(1960)
  })

  it('handles pipe and comma delimited invoices gracefully', () => {
    const delimitedSample = `
Vendor: Prime Retail Hub
Invoice No: PR-4011
Date: 2026-10-27

Item | Quantity | Cost
HP LaserJet Toner 85A | 5 | 14500
Wireless Ergonomic Mouse | 12 | 6200
USB-C Fast Charging Cable | 30 | 1800
    `

    const result = parseInvoiceText(delimitedSample)

    expect(result.invoiceNumber).toBe('PR-4011')
    expect(result.supplierName).toContain('Prime Retail Hub')
    expect(result.items.length).toBe(3)
    expect(result.items[0].name).toBe('HP LaserJet Toner 85A')
    expect(result.items[0].quantity).toBe(5)
    expect(result.items[0].unitCostPrice).toBe(14500)
  })
})
