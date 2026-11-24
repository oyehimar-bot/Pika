import { useState } from 'react'
import { X, Phone, MessageSquare, DollarSign, Receipt, CheckCircle } from 'lucide-react'
import type { Debtor } from '@/db'
import { useDebtorDetails } from '@/hooks/useDatabase'
import { formatCurrency } from '@/utils/currency'
import { RecordPaymentModal } from './RecordPaymentModal'
import { useAppSettings } from '@/context/AppSettingsContext'

interface DebtorDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  debtor: Debtor | null
}

export function DebtorDetailsModal({
  isOpen,
  onClose,
  debtor,
}: DebtorDetailsModalProps) {
  const { storeName } = useAppSettings()
  const debtorDetails = useDebtorDetails(debtor?.id)
  const [activeTab, setActiveTab] = useState<'sales' | 'payments'>('sales')
  const [isRecordPayOpen, setIsRecordPayOpen] = useState(false)

  if (!isOpen || !debtor) return null

  // WhatsApp balance reminder URL generator
  const getWhatsAppReminderUrl = () => {
    let phone = (debtor.phone || '').replace(/\D/g, '')
    if (phone.length === 11 && phone.startsWith('0')) {
      phone = '234' + phone.slice(1)
    }

    const message = `Hello ${debtor.name},\nThis is a friendly reminder from *${storeName || 'Pika Store'}* regarding your outstanding balance of *${formatCurrency(debtor.balance)}*.\nKindly let us know when it will be convenient to settle. Thank you for your patronage!`
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div
          className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl animate-scale-in flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  {debtor.name}
                </h2>
                {debtor.balance <= 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Paid in Full
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Owing Balance
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                {debtor.phone ? (
                  <span>Phone: {debtor.phone}</span>
                ) : (
                  <span>No phone recorded</span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Account Overview Cards */}
          <div className="p-6 border-b border-slate-100 grid grid-cols-3 gap-3 bg-white">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Credit
              </span>
              <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">
                {formatCurrency(debtor.totalOwed)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                Total Paid Back
              </span>
              <span className="text-lg font-bold font-mono text-emerald-700 mt-1 block">
                {formatCurrency(debtor.totalPaid)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                Balance Due
              </span>
              <span className="text-lg font-bold font-mono text-amber-900 mt-1 block">
                {formatCurrency(debtor.balance)}
              </span>
            </div>
          </div>

          {/* Quick Contact & Action Bar */}
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {debtor.phone && (
                <>
                  <a
                    href={`tel:${debtor.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-medium transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Call</span>
                  </a>

                  <a
                    href={getWhatsAppReminderUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors shadow-xs"
                    title="Send friendly balance reminder via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Reminder</span>
                  </a>
                </>
              )}
            </div>

            {debtor.balance > 0 && (
              <button
                onClick={() => setIsRecordPayOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors shadow-xs"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}
          </div>

          {/* Tabs: Credit Purchases vs Payment History */}
          <div className="flex border-b border-slate-200 px-6 bg-white">
            <button
              onClick={() => setActiveTab('sales')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'sales'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Credit Purchases ({debtorDetails?.sales.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'payments'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Payment History ({debtorDetails?.payments.length || 0})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'sales' ? (
              <div className="space-y-2">
                {debtorDetails?.sales && debtorDetails.sales.length > 0 ? (
                  debtorDetails.sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-3.5 h-3.5 text-purple-600" />
                          <span className="font-mono font-bold text-slate-800">
                            {sale.transactionId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(sale.timestamp).toLocaleString('en-NG', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}{' '}
                          • Cashier: {sale.staffName}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-slate-900 font-mono text-sm block">
                          {formatCurrency(sale.totalAmount)}
                        </span>
                        <span className="text-[10px] text-amber-700 font-medium">
                          Credit Sale
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No credit sales found for this customer.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {debtorDetails?.payments && debtorDetails.payments.length > 0 ? (
                  debtorDetails.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Paid via {p.paymentMethod.toUpperCase()}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(p.timestamp).toLocaleString('en-NG', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}{' '}
                          • Received by {p.staffName}
                          {p.notes ? ` • Note: ${p.notes}` : ''}
                        </div>
                      </div>

                      <div className="text-right font-bold text-emerald-700 font-mono text-sm">
                        +{formatCurrency(p.amount)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No debt payments recorded yet.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Record Payment Submodal */}
      <RecordPaymentModal
        isOpen={isRecordPayOpen}
        onClose={() => setIsRecordPayOpen(false)}
        debtor={debtor}
      />
    </>
  )
}
