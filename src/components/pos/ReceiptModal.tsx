import { useRef } from 'react'
import { Printer, X, Tag } from 'lucide-react'
import type { SaleWithItems } from '@/db'
import { formatCurrency } from '@/utils/currency'
import { useAppSettings } from '@/context/AppSettingsContext'

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  sale: SaleWithItems | null
  cashTendered?: number
  cashChange?: number
  isReprint?: boolean
}

export function ReceiptModal({
  isOpen,
  onClose,
  sale,
  cashTendered,
  cashChange,
  isReprint = false,
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const { storeName } = useAppSettings()

  if (!isOpen || !sale) return null

  const handlePrint = () => {
    window.print()
  }

  const paymentLabels: Record<string, string> = {
    cash: 'CASH',
    transfer: 'BANK TRANSFER',
    card: 'POS / CARD',
  }

  const dateFormatted = new Date(sale.timestamp).toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:static">
      <div
        className="relative w-full max-w-sm max-h-[95vh] flex flex-col overflow-hidden rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-2xl shadow-pika-950/40 animate-scale-in print:border-none print:shadow-none print:max-w-none print:w-[80mm] print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Action Header (hidden during thermal printing) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {isReprint ? 'Receipt Viewer (Thermal Reprint)' : 'Sale Completed Successfully'}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Container — formatted strictly for 80mm / 58mm POS thermal printers */}
        <div
          ref={receiptRef}
          className="flex-1 overflow-y-auto p-6 bg-white text-gray-900 font-mono text-xs select-none print:p-2 print:overflow-visible"
        >
          {/* Receipt Header */}
          <div className="text-center pb-3 border-b border-dashed border-gray-300">
            <div className="flex items-center justify-center mb-1">
              <img
                src="/pika-logo.png"
                alt="Pika"
                className="w-10 h-10 object-contain"
              />
            </div>
            <h1 className="text-base font-extrabold tracking-tight uppercase text-gray-900">
              {storeName || 'Pika SME Enterprise'}
            </h1>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Retail & Inventory Stock Management
            </p>
            {isReprint ? (
              <p className="text-[10px] font-bold text-gray-700 font-sans mt-0.5 bg-gray-100 py-0.5 rounded">
                *** REPRINT / DUPLICATE RECEIPT ***
              </p>
            ) : (
              <p className="text-[10px] text-gray-400 font-sans mt-0.5">
                Official Purchase Customer Receipt
              </p>
            )}
          </div>

          {/* Receipt Metadata */}
          <div className="py-2.5 border-b border-dashed border-gray-300 text-[10px] text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Receipt Ref:</span>
              <span className="font-bold text-gray-900">{sale.transactionId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date & Time:</span>
              <span>{dateFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cashier / Staff:</span>
              <span>{sale.staffName} (ID: {sale.staffId})</span>
            </div>
            {sale.customerName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span>{sale.customerName}</span>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          <div className="py-3 border-b border-dashed border-gray-300">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-[10px]">
                  <th className="pb-1">Item</th>
                  <th className="pb-1 text-center">Qty</th>
                  <th className="pb-1 text-right">Price</th>
                  <th className="pb-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sale.items.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-1.5 pr-1">
                      <div className="font-semibold text-gray-900 line-clamp-1">
                        {item.productName}
                      </div>
                      <div className="text-[9px] text-gray-500 font-mono flex items-center gap-1">
                        <span>Lot: {item.batchNumber}</span>
                        {item.priceVariance && item.priceVariance !== 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-purple-700 font-medium">
                            <Tag className="w-2.5 h-2.5" />
                            <span>Override</span>
                          </span>
                        ) : null}
                      </div>
                      {item.varianceNote && (
                        <div className="text-[8px] text-purple-600 italic">
                          Note: {item.varianceNote}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 text-center text-gray-800">
                      {item.quantity}
                    </td>
                    <td className="py-1.5 text-right text-gray-700">
                      {formatCurrency(item.unitSellingPrice)}
                    </td>
                    <td className="py-1.5 text-right font-semibold text-gray-900">
                      {formatCurrency(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="py-2.5 border-b border-dashed border-gray-300 text-[11px] space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-purple-700 font-medium">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax / VAT:</span>
                <span>{formatCurrency(sale.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-gray-900 pt-1.5 border-t border-gray-300">
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.totalAmount)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="py-2.5 border-b border-dashed border-gray-300 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Method:</span>
              <span className="font-bold">
                {paymentLabels[sale.paymentMethod] || sale.paymentMethod.toUpperCase()}
              </span>
            </div>
            {sale.paymentMethod === 'cash' && cashTendered !== undefined && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Cash Tendered:</span>
                  <span>{formatCurrency(cashTendered)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Change Given:</span>
                  <span>{formatCurrency(cashChange ?? 0)}</span>
                </div>
              </>
            )}
            {sale.notes && (
              <div className="pt-1 text-[10px] text-gray-500 italic">
                Note: {sale.notes}
              </div>
            )}
          </div>

          {/* Receipt Footer */}
          <div className="text-center pt-3 text-[10px] text-gray-500 space-y-0.5">
            <p className="font-semibold text-gray-700">Thank you for your patronage!</p>
            <p>Goods sold in good condition are not returnable.</p>
            <p className="text-[9px] text-gray-400 font-sans pt-1">
              Powered by Pika • Local-First Inventory & POS
            </p>
          </div>
        </div>

        {/* Modal Controls (hidden during thermal printing) */}
        <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 flex gap-2.5 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-surface-300 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-700 text-xs font-semibold transition-colors"
          >
            Close / New Sale
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  )
}
