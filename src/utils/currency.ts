/**
 * Currency and Number Formatting Utilities for Pika
 * Standardized to Nigerian Naira (₦ / NGN)
 */

export const CURRENCY_SYMBOL = '₦'
export const CURRENCY_CODE = 'NGN'

/**
 * Formats a numeric value into Nigerian Naira currency representation.
 * Example: 15000 -> "₦15,000.00"
 * Example: -500 -> "-₦500.00"
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    compact?: boolean
  } = {}
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${CURRENCY_SYMBOL}0.00`
  }

  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    compact = false,
  } = options

  if (compact) {
    const absVal = Math.abs(amount)
    const sign = amount < 0 ? '-' : ''
    if (absVal >= 1_000_000) {
      return `${sign}${CURRENCY_SYMBOL}${(absVal / 1_000_000).toFixed(1)}M`
    }
    if (absVal >= 1_000) {
      return `${sign}${CURRENCY_SYMBOL}${(absVal / 1_000).toFixed(1)}k`
    }
  }

  const isNegative = amount < 0
  const absAmount = Math.abs(amount)

  const formattedNum = absAmount.toLocaleString('en-NG', {
    minimumFractionDigits,
    maximumFractionDigits,
  })

  return `${isNegative ? '-' : ''}${CURRENCY_SYMBOL}${formattedNum}`
}

/**
 * Formats a regular number with thousands comma separators.
 * Example: 1250 -> "1,250"
 */
export function formatNumber(
  num: number | null | undefined,
  decimals = 0
): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0'
  }
  return num.toLocaleString('en-NG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Strips currency symbols and commas to extract numeric float.
 * Example: "₦15,000.50" -> 15000.50
 */
export function parseCurrency(input: string | number): number {
  if (typeof input === 'number') return isNaN(input) ? 0 : input
  if (!input) return 0
  const cleaned = input.replace(/[^0-9.-]/g, '')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}
