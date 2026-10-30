import { useRef } from 'react'
import { Printer, X, ShoppingBag } from 'lucide-react'
import type { SaleWithItems } from '@/db'

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  sale: SaleWithItems | null
  cashTendered?: number
  cashChange?: number
}

export function ReceiptModal({
  isOpen,
  onClose,
  sale,
  cashTendered,
  cashChange,
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !sale) return null

  const handlePrint = () => {
    window.print()
  }

  const paymentLabels: Record<string, string> = {
    cash: 'CASH',
    card: 'CARD / POS TERMINAL',
    transfer: 'BANK TRANSFER',
    mobile: 'MOBILE MONEY',
    split: 'SPLIT PAYMENT',
  }

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
            Sale Completed Successfully
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Paper Container */}
        <div className="overflow-y-auto p-6 text-surface-900 dark:text-surface-100 font-mono text-xs print:p-0 print:overflow-visible">
          <div
            ref={receiptRef}
            className="mx-auto w-full max-w-[320px] bg-white text-black p-4 rounded-xl border border-dashed border-surface-300 shadow-inner print:border-none print:shadow-none print:p-0 print:max-w-[80mm]"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-gray-300">
              <div className="flex items-center justify-center gap-1.5 font-sans font-black text-base text-gray-900 mb-0.5">
                <ShoppingBag className="w-4 h-4" />
                PIKA RETAIL STORE
              </div>
              <p className="text-[10px] text-gray-600">
                12 Market Road, Central Commercial District
              </p>
              <p className="text-[10px] text-gray-600">Tel: +234 (0) 800-PIKA-POS</p>
              <div className="mt-2 text-[10px] text-gray-500 font-sans uppercase">
                *** OFFICIAL RECEIPT ***
              </div>
            </div>

            {/* Transaction Metadata */}
            <div className="py-2.5 border-b border-dashed border-gray-300 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Receipt No:</span>
                <span className="font-bold">{sale.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date/Time:</span>
                <span>{new Date(sale.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cashier:</span>
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
                        <div className="text-[9px] text-gray-500 font-mono">
                          Lot: {item.batchNumber}
                        </div>
                      </td>
                      <td className="py-1.5 text-center text-gray-800">
                        {item.quantity}
                      </td>
                      <td className="py-1.5 text-right text-gray-700">
                        {item.unitSellingPrice.toFixed(2)}
                      </td>
                      <td className="py-1.5 text-right font-semibold text-gray-900">
                        ₦{item.lineTotal.toFixed(2)}
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
                <span>₦{sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount:</span>
                  <span>-₦{sale.discount.toFixed(2)}</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax / VAT:</span>
                  <span>₦{sale.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-gray-900 pt-1.5 border-t border-gray-300">
                <span>TOTAL:</span>
                <span>₦{sale.totalAmount.toFixed(2)}</span>
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
                    <span>₦{cashTendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900">
                    <span>Change Given:</span>
                    <span>₦{(cashChange ?? 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Barcode & Footer */}
            <div className="pt-4 text-center space-y-2">
              {/* Pseudo Barcode */}
              <div className="font-mono text-xs tracking-[0.3em] font-black text-gray-800 select-all">
                ||| | |||| | ||| |||| | ||
              </div>
              <div className="text-[10px] font-mono text-gray-500">
                {sale.transactionId}
              </div>

              <div className="text-[10px] text-gray-600 pt-2 font-sans">
                Thank you for your business! Please keep this receipt for returns within 7 days.
              </div>
              <div className="text-[9px] text-gray-400 font-sans">
                Local-First Inventory • Powered by Pika
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions (hidden during printing) */}
        <div className="p-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-800/50 flex items-center justify-between gap-3 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-xs font-semibold hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            New Sale (Esc)
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-pika-600 hover:bg-pika-700 text-white text-xs font-bold shadow-md shadow-pika-600/25 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  )
}
