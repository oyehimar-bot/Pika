import { describe, it, expect } from 'vitest'
import { encodeCode128, generateBarcodeSvg, generateBarcodeSvgDataUrl } from '../barcode'

describe('Code 128 Barcode Generator', () => {
  it('correctly encodes alphanumeric and numeric text into SVG bar patterns', () => {
    const result = encodeCode128('PIKA1234')
    expect(result.modules).toBeGreaterThan(50)
    expect(result.rectsSvg).toContain('<rect')
    expect(result.viewBox).toContain('0 0')
  })

  it('generates a valid standalone SVG XML string with rect elements and label', () => {
    const svg = generateBarcodeSvg('SKU-990011')
    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox')
    expect(svg).toContain('<rect')
    expect(svg).toContain('</svg>')
  })

  it('generates a data:image/svg+xml data URL', () => {
    const dataUrl = generateBarcodeSvgDataUrl('ITEM-88')
    expect(dataUrl.startsWith('data:image/svg+xml;utf8,')).toBe(true)
  })

  it('handles purely numeric codes (EAN/UPC-style numbers)', () => {
    const result = encodeCode128('6151234567890')
    expect(result.rectsSvg).toContain('<rect')
    expect(result.modules).toBeGreaterThan(60)
  })

  it('handles spaces and symbols gracefully', () => {
    const result = encodeCode128('MILK-12-CTN')
    expect(result.rectsSvg).toContain('<rect')
    expect(result.modules).toBeGreaterThan(50)
  })
})
