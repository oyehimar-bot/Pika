import { useState } from 'react'
import { X, DollarSign, Building, CreditCard, Check, AlertCircle } from 'lucide-react'
import type { Debtor } from '@/db'
import { recordDebtorPayment } from '@/db'
import { formatCurrency } from '@/utils/currency'
import { useAuth } from '@/context/AuthContext'

interface RecordPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  debtor: Debtor | null
  onSuccess?: () => void
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  debtor,
  onSuccess,
}: RecordPaymentModalProps) {
  const { currentStaff } = useAuth()
  const [amount, setAmount] = useState<string>(debtor ? String(debtor.balance) : '')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !debtor) return null

  const balanceNum = debtor.balance

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const payAmt = parseFloat(amount)
    if (isNaN(payAmt) || payAmt <= 0) {
      setError('Please enter a valid payment amount greater than zero.')
      return
    }

    try {
      setIsSubmitting(true)
      await recordDebtorPayment({
        debtorId: debtor.id!,
        amount: payAmt,
        paymentMethod,
        staffId: currentStaff?.id ? String(currentStaff.id) : '1',
        staffName: currentStaff?.name || 'Cashier',
        notes: notes.trim() || undefined,
      })

      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record payment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              Record Debt Payment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Receiving payment from <span className="font-semibold text-slate-800">{debtor.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Debt Card */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
                Outstanding Balance
              </span>
              <span className="text-xl font-bold font-mono text-amber-900 mt-0.5 block">
                {formatCurrency(balanceNum)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAmount(String(balanceNum))}
              className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
            >
              Pay Full
            </button>
          </div>

          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount Paid (₦) *
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Payment Method *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cash', label: 'Cash', icon: DollarSign },
                { id: 'transfer', label: 'Transfer', icon: Building },
                { id: 'card', label: 'POS / Card', icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon
                const isSelected = paymentMethod === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as typeof paymentMethod)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes / Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Note / Bank Ref (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bank Transfer Ref: GTB-90218"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording…' : 'Record Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
