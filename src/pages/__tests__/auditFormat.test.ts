import { describe, it, expect } from 'vitest'
import { parsePayload, humanizeKey, formatValue } from '../AuditPage'

describe('Audit Log Payload Parsing & Humanization', () => {
  it('detects and parses JSON stringified details payloads', () => {
    const rawJson = '{"oldPrice": 500, "newPrice": 450, "reason": "Manager discount"}'
    const parsed = parsePayload(rawJson)

    expect(parsed).not.toBeNull()
    expect(parsed?.oldPrice).toBe(500)
    expect(parsed?.newPrice).toBe(450)
    expect(parsed?.reason).toBe('Manager discount')
  })

  it('handles already parsed object details payloads', () => {
    const obj = { previousQty: 20, newQty: 15, reason: 'Damaged item' }
    const parsed = parsePayload(obj)

    expect(parsed).toEqual(obj)
  })

  it('returns null for non-JSON plain string details', () => {
    const plainText = 'Batch BAT-001 received with 50 units'
    expect(parsePayload(plainText)).toBeNull()
  })

  it('humanizes camelCase and snake_case keys into readable titles', () => {
    expect(humanizeKey('oldPrice')).toBe('Old Price')
    expect(humanizeKey('newPrice')).toBe('New Price')
    expect(humanizeKey('previousQty')).toBe('Previous Quantity')
    expect(humanizeKey('newQty')).toBe('New Quantity')
    expect(humanizeKey('transactionId')).toBe('Transaction ID')
    expect(humanizeKey('customFieldKey')).toBe('Custom Field Key')
  })

  it('formats currency values cleanly using Naira symbol without raw json braces', () => {
    const formatted = formatValue('oldPrice', 500)
    expect(formatted).toContain('₦500.00')
    expect(formatted).not.toContain('{')
    expect(formatted).not.toContain('}')
    expect(formatted).not.toContain('"')
  })

  it('formats non-currency numeric and boolean values cleanly', () => {
    expect(formatValue('isActive', true)).toBe('Yes')
    expect(formatValue('isActive', false)).toBe('No')
    expect(formatValue('itemCount', 10)).toBe('10')
  })
})
