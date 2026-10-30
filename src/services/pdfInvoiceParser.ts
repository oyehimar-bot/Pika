/**
 * Client-Side Smart PDF Invoice Parsing Engine
 * Extracts structured line items, quantities, and cost prices using pdfjs-dist
 */

import * as pdfjsLib from 'pdfjs-dist'

// Configure worker URL for Vite bundling
if (typeof window !== 'undefined' && 'Worker' in window) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()
  } catch {
    // Fallback worker path if URL resolution fails
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'
  }
}

export interface ExtractedInvoiceItem {
  id: string
  name: string
  sku: string
  category: string
  quantity: number
  unitCostPrice: number
  suggestedSellingPrice: number
  lineTotal: number
  batchNumber: string
  expiryDate?: string
  confidence: number // 0 to 1
  matchedProductId?: number
  isNewProduct: boolean
}

export interface ExtractedInvoiceResult {
  supplierName?: string
  invoiceNumber?: string
  invoiceDate?: string
  totalAmount?: number
  rawText: string
  items: ExtractedInvoiceItem[]
}

/**
 * Extracts plain text line-by-line from a PDF file using pdfjs-dist.
 */
export async function extractTextFromPDF(file: File | ArrayBuffer): Promise<string> {
  const data = file instanceof File ? await file.arrayBuffer() : file
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) })
  const pdf = await loadingTask.promise

  const textLines: string[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()

    // Group text items by roughly their Y coordinate to reconstruct visual lines
    interface TextItemWithPos {
      str: string
      x: number
      y: number
    }

    const itemsWithPos: TextItemWithPos[] = []

    for (const item of content.items) {
      if ('str' in item && typeof item.str === 'string') {
        const text = item.str.trim()
        if (text) {
          const transform = item.transform
          const x = transform[4] || 0
          const y = transform[5] || 0
          itemsWithPos.push({ str: text, x, y })
        }
      }
    }

    // Sort by Y descending (top to bottom), then X ascending (left to right)
    itemsWithPos.sort((a, b) => {
      const yDiff = b.y - a.y
      if (Math.abs(yDiff) > 4) {
        return yDiff
      }
      return a.x - b.x
    })

    // Group into horizontal lines
    let currentY: number | null = null
    let currentLineTokens: string[] = []

    for (const item of itemsWithPos) {
      if (currentY === null || Math.abs(item.y - currentY) > 4) {
        if (currentLineTokens.length > 0) {
          textLines.push(currentLineTokens.join(' '))
        }
        currentY = item.y
        currentLineTokens = [item.str]
      } else {
        currentLineTokens.push(item.str)
      }
    }

    if (currentLineTokens.length > 0) {
      textLines.push(currentLineTokens.join(' '))
    }
  }

  return textLines.join('\n')
}

/**
 * Clean numeric string representation (removes currency symbols, commas)
 */
function cleanNumber(str: string): number {
  if (!str) return 0
  const cleaned = str.replace(/[₦$€£,]/g, '').trim()
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : val
}

/**
 * Generate a clean SKU from product name
 */
function generateSKU(name: string, index: number): string {
  const initials = name
    .split(/[\s-_]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
    .join('')
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  return `${initials || 'ITEM'}-${index + 1}-${randomSuffix}`
}

/**
 * Generate default batch number
 */
function generateBatchNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const rand = Math.floor(100 + Math.random() * 900)
  return `BAT-${dateStr}-${rand}`
}

/**
 * Parses raw text extracted from an invoice into structured line items.
 */
export function parseInvoiceText(rawText: string): ExtractedInvoiceResult {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  let supplierName: string | undefined
  let invoiceNumber: string | undefined
  let invoiceDate: string | undefined
  let totalAmount: number | undefined

  // 1. Scan for invoice header metadata
  for (const line of lines) {
    // Invoice number
    if (!invoiceNumber) {
      if (!/^(?:INVOICE|BILL|RECEIPT)$/i.test(line.trim())) {
        const invMatch =
          line.match(/(?:Invoice|Inv|Bill|Receipt|Ref)\s*(?:#|No\.?|Num\.?)[:\s]+([A-Za-z0-9-_/]+)/i) ||
          line.match(/(?:Invoice|Inv|Bill|Receipt|Ref)\s+#?\s*([A-Za-z0-9-_/]+)/i)
        if (invMatch && invMatch[1].length >= 3 && !/^(?:date|total|for|to)$/i.test(invMatch[1])) {
          invoiceNumber = invMatch[1].trim()
        }
      }
    }

    // Invoice Date
    if (!invoiceDate) {
      const dateMatch = line.match(/(?:Date|Dated|Issued)[:\s]*([0-9]{1,4}[-/.][0-9]{1,2}[-/.][0-9]{1,4})/i)
      if (dateMatch) {
        invoiceDate = dateMatch[1].trim()
      }
    }

    // Supplier / Vendor
    if (!supplierName) {
      const supplierMatch = line.match(/(?:From|Supplier|Vendor|Sold By|Billed By)[:\s]*([A-Za-z0-9\s.,&'-]+)/i)
      if (supplierMatch && supplierMatch[1].length > 3) {
        supplierName = supplierMatch[1].trim()
      }
    }

    // Grand total
    if (!totalAmount) {
      const totalMatch = line.match(/(?:Total|Grand Total|Amount Due|Net Payable)[:\s]*[₦$€£]?\s*([0-9,]+(?:\.[0-9]{2})?)/i)
      if (totalMatch) {
        totalAmount = cleanNumber(totalMatch[1])
      }
    }
  }

  // 2. Scan for line items
  const items: ExtractedInvoiceItem[] = []
  const delimiterRegex = /[|\t;]/

  let itemIdx = 0

  for (const line of lines) {
    // Skip common header / footer keywords
    const lower = line.toLowerCase()
    if (
      lower.includes('invoice #') ||
      lower.includes('subtotal') ||
      lower.includes('grand total') ||
      lower.includes('description') ||
      lower.includes('unit price') ||
      lower.includes('page ') ||
      lower.includes('thank you for your business') ||
      lower.includes('payment terms') ||
      lower.includes('bank details')
    ) {
      continue
    }

    // Check delimited pattern (pipes, commas, tabs)
    if (delimiterRegex.test(line)) {
      const parts = line.split(delimiterRegex).map((p) => p.trim()).filter(Boolean)
      if (parts.length >= 3) {
        const descCandidate = parts[0]
        const num1 = cleanNumber(parts[1])
        const num2 = cleanNumber(parts[2])

        if (descCandidate.length >= 2 && num1 > 0 && num2 > 0) {
          const qty = num1
          const unitCost = num2
          const sellingPrice = Math.round(unitCost * 1.3) // 30% margin default
          const lineTotal = Math.round(qty * unitCost * 100) / 100

          items.push({
            id: `item-${Date.now()}-${itemIdx}`,
            name: descCandidate,
            sku: generateSKU(descCandidate, itemIdx),
            category: 'General',
            quantity: qty,
            unitCostPrice: unitCost,
            suggestedSellingPrice: sellingPrice,
            lineTotal,
            batchNumber: generateBatchNumber(),
            confidence: 0.85,
            isNewProduct: true,
          })
          itemIdx++
          continue
        }
      }
    }

    // Strategy A: 2 or more consecutive spaces separating columns
    const multiSpaceParts = line.trim().split(/\s{2,}|\t/).map((p) => p.trim()).filter(Boolean)
    if (multiSpaceParts.length >= 3) {
      const descCandidate = multiSpaceParts[0]
      const num1 = cleanNumber(multiSpaceParts[1])
      const num2 = cleanNumber(multiSpaceParts[2])
      const num3 = multiSpaceParts[3] ? cleanNumber(multiSpaceParts[3]) : undefined

      if (descCandidate.length >= 2 && num1 > 0 && num2 > 0) {
        const qty = num1
        let unitCost = num2
        let lineTotal = num3 || Math.round(qty * unitCost * 100) / 100

        if (num3 && num3 < num2 && Math.abs(num3 * qty - num2) < 2) {
          unitCost = num3
          lineTotal = num2
        }

        const sellingPrice = Math.round(unitCost * 1.3)

        items.push({
          id: `item-${Date.now()}-${itemIdx}`,
          name: descCandidate,
          sku: generateSKU(descCandidate, itemIdx),
          category: 'General',
          quantity: qty,
          unitCostPrice: unitCost,
          suggestedSellingPrice: sellingPrice,
          lineTotal,
          batchNumber: generateBatchNumber(),
          confidence: 0.9,
          isNewProduct: true,
        })
        itemIdx++
        continue
      }
    }

    // Strategy B: Fallback trailing regex with strict numeric quantity and currency price
    const trailingMatch = line.trim().match(/^(.*?)\s+([0-9]+(?:\.[0-9]+)?)\s+([₦$€£]?\s*[0-9,]+(?:\.[0-9]+)?)(?:\s+([₦$€£]?\s*[0-9,]+(?:\.[0-9]+)?))?$/)
    if (trailingMatch) {
      const desc = trailingMatch[1].trim()
      const qty = parseFloat(trailingMatch[2])
      const price1 = cleanNumber(trailingMatch[3])
      const price2 = trailingMatch[4] ? cleanNumber(trailingMatch[4]) : undefined

      if (desc.length >= 2 && !/^\d+$/.test(desc) && qty > 0 && price1 > 0) {
        let unitCost = price1
        let lineTotal = price2 || Math.round(qty * unitCost * 100) / 100

        if (price2 && price2 < price1 && Math.abs(price2 * qty - price1) < 2) {
          unitCost = price2
          lineTotal = price1
        }

        const sellingPrice = Math.round(unitCost * 1.3)

        items.push({
          id: `item-${Date.now()}-${itemIdx}`,
          name: desc,
          sku: generateSKU(desc, itemIdx),
          category: 'General',
          quantity: qty,
          unitCostPrice: unitCost,
          suggestedSellingPrice: sellingPrice,
          lineTotal,
          batchNumber: generateBatchNumber(),
          confidence: 0.85,
          isNewProduct: true,
        })
        itemIdx++
      }
    }
  }

  return {
    supplierName,
    invoiceNumber,
    invoiceDate,
    totalAmount,
    rawText,
    items,
  }
}

/**
 * End-to-end extraction from a PDF File or Buffer
 */
export async function parseInvoicePDF(file: File | ArrayBuffer): Promise<ExtractedInvoiceResult> {
  const rawText = await extractTextFromPDF(file)
  return parseInvoiceText(rawText)
}
