import { describe, it, expect } from 'vitest'
import { formatCurrency, formatNumber, parseCurrency, CURRENCY_SYMBOL } from '../currency'

describe('Currency Localization & Utility (NGN ₦)', () => {
  it('formats standard amounts with Naira symbol and 2 decimal places', () => {
    expect(formatCurrency(15000)).toBe('₦15,000.00')
    expect(formatCurrency(0)).toBe('₦0.00')
    expect(formatCurrency(250.5)).toBe('₦250.50')
    expect(formatCurrency(1234567.89)).toBe('₦1,234,567.89')
  })

  it('handles negative amounts correctly', () => {
    expect(formatCurrency(-500)).toBe('-₦500.00')
    expect(formatCurrency(-12500.75)).toBe('-₦12,500.75')
  })

  it('handles null, undefined, or NaN safely by returning ₦0.00', () => {
    expect(formatCurrency(null)).toBe('₦0.00')
    expect(formatCurrency(undefined)).toBe('₦0.00')
    expect(formatCurrency(NaN)).toBe('₦0.00')
  })

  it('supports compact notation for large SME valuations', () => {
    expect(formatCurrency(1500, { compact: true })).toBe('₦1.5k')
    expect(formatCurrency(2500000, { compact: true })).toBe('₦2.5M')
    expect(formatCurrency(-5000, { compact: true })).toBe('-₦5.0k')
  })

  it('formats plain numbers with comma separators', () => {
    expect(formatNumber(1250)).toBe('1,250')
    expect(formatNumber(1000000)).toBe('1,000,000')
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(null)).toBe('0')
  })

  it('parses formatted currency strings into numeric floats', () => {
    expect(parseCurrency('₦15,000.00')).toBe(15000)
    expect(parseCurrency('₦250.50')).toBe(250.5)
    expect(parseCurrency('-₦500.00')).toBe(-500)
    expect(parseCurrency(123.45)).toBe(123.45)
    expect(parseCurrency('')).toBe(0)
  })

  it('exports valid CURRENCY_SYMBOL', () => {
    expect(CURRENCY_SYMBOL).toBe('₦')
  })
})
