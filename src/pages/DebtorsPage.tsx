import { useState, useMemo } from 'react'
import {
  Users,
  Search,
  DollarSign,
  MessageSquare,
  FileText,
  CheckCircle,
  Download,
} from 'lucide-react'
import type { Debtor } from '@/db'
import { useDebtors, useDebtorStats } from '@/hooks/useDatabase'
import { formatCurrency } from '@/utils/currency'
import { RecordPaymentModal } from '@/components/debtors/RecordPaymentModal'
import { DebtorDetailsModal } from '@/components/debtors/DebtorDetailsModal'
import { useAppSettings } from '@/context/AppSettingsContext'

export function DebtorsPage() {
  const { storeName } = useAppSettings()
  const allDebtors = useDebtors()
  const stats = useDebtorStats()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'owing' | 'settled'>('all')

  // Modals state
  const [payingDebtor, setPayingDebtor] = useState<Debtor | null>(null)
  const [inspectingDebtor, setInspectingDebtor] = useState<Debtor | null>(null)

  // Filtered debtors list
  const filteredDebtors = useMemo(() => {
    if (!allDebtors) return []
    return allDebtors.filter((d) => {
      // Filter tab
      if (filterMode === 'owing' && d.balance <= 0) return false
      if (filterMode === 'settled' && d.balance > 0) return false

      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = d.name.toLowerCase().includes(q)
        const matchPhone = d.phone.toLowerCase().includes(q)
        if (!matchName && !matchPhone) return false
      }

      return true
    })
  }, [allDebtors, filterMode, searchQuery])

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredDebtors || filteredDebtors.length === 0) return
    const headers = ['Customer Name', 'Phone', 'Total Credit (NGN)', 'Total Paid (NGN)', 'Balance Due (NGN)', 'Status']
    const rows = filteredDebtors.map((d) => [
      `"${d.name.replace(/"/g, '""')}"`,
      `"${d.phone}"`,
      d.totalOwed,
      d.totalPaid,
      d.balance,
      d.balance > 0 ? 'Owing' : 'Settled',
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `debtors-report-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getWhatsAppReminderUrl = (debtor: Debtor) => {
    let phone = (debtor.phone || '').replace(/\D/g, '')
    if (phone.length === 11 && phone.startsWith('0')) {
      phone = '234' + phone.slice(1)
    }

    const message = `Hello ${debtor.name},\nThis is a friendly reminder from *${storeName || 'Pika Store'}* regarding your outstanding balance of *${formatCurrency(debtor.balance)}*.\nKindly let us know when it will be convenient to settle. Thank you for your business!`
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Debtors & Credit Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track customer debts, record installment payments, and send instant WhatsApp statement reminders
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={!allDebtors || allDebtors.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5 text-purple-600" />
          <span>Export Debtors CSV</span>
        </button>
      </div>

      {/* ─── 3-Column Metric Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Outstanding Balance */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-32">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Total Outstanding Debt
            </h3>
            <p className="text-2xl font-bold text-slate-900 mt-1.5 font-mono">
              {formatCurrency(stats?.totalOutstanding ?? 0)}
            </p>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>{stats?.activeDebtorsCount ?? 0} customer(s) owing</span>
            <span className="text-[11px] font-semibold text-amber-700">Uncollected</span>
          </div>
        </div>

        {/* Card 2: Total Credit Given */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-32">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-purple-700">
              Goods Given on Credit
            </h3>
            <p className="text-2xl font-bold text-slate-900 mt-1.5 font-mono">
              {formatCurrency(stats?.totalCreditGiven ?? 0)}
            </p>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Cumulative across {stats?.totalDebtors ?? 0} account(s)</span>
            <span className="text-[11px] font-semibold text-purple-700">All Time</span>
          </div>
        </div>

        {/* Card 3: Debt Collected */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-32">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Total Recovered / Paid
            </h3>
            <p className="text-2xl font-bold text-slate-900 mt-1.5 font-mono">
              {formatCurrency(stats?.totalCollected ?? 0)}
            </p>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>
              {stats?.totalCreditGiven && stats.totalCreditGiven > 0
                ? `${Math.round((stats.totalCollected / stats.totalCreditGiven) * 100)}% recovery rate`
                : 'Zero debt'}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700">Collected</span>
          </div>
        </div>
      </div>

      {/* ─── Main Table Container ────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search debtor name or phone..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterMode === 'all'
                  ? 'bg-white text-purple-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({allDebtors?.length || 0})
            </button>
            <button
              onClick={() => setFilterMode('owing')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterMode === 'owing'
                  ? 'bg-white text-amber-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Owing ({allDebtors?.filter((d) => d.balance > 0).length || 0})
            </button>
            <button
              onClick={() => setFilterMode('settled')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filterMode === 'settled'
                  ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settled ({allDebtors?.filter((d) => d.balance <= 0).length || 0})
            </button>
          </div>
        </div>

        {/* Debtors Table */}
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-xs font-medium">
                <th className="py-3 px-3">Customer Name</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3 text-right">Total Credit</th>
                <th className="py-3 px-3 text-right">Paid So Far</th>
                <th className="py-3 px-3 text-right">Balance Due</th>
                <th className="py-3 px-3">Last Activity</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDebtors.length > 0 ? (
                filteredDebtors.map((debtor) => {
                  const isOwing = debtor.balance > 0
                  return (
                    <tr
                      key={debtor.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Customer Name */}
                      <td className="py-4 px-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-bold flex items-center justify-center text-xs">
                            {debtor.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block">{debtor.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              Debtor ID: #{debtor.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-3 text-slate-600 font-mono text-xs">
                        {debtor.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span>{debtor.phone}</span>
                            <a
                              href={getWhatsAppReminderUrl(debtor)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Send WhatsApp reminder"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Total Credit (₦) */}
                      <td className="py-4 px-3 text-right font-mono font-medium text-slate-700">
                        {formatCurrency(debtor.totalOwed)}
                      </td>

                      {/* Total Paid (₦) */}
                      <td className="py-4 px-3 text-right font-mono font-medium text-emerald-600">
                        {formatCurrency(debtor.totalPaid)}
                      </td>

                      {/* Balance Due (₦) */}
                      <td className="py-4 px-3 text-right font-mono font-bold text-sm">
                        {isOwing ? (
                          <span className="text-amber-700">
                            {formatCurrency(debtor.balance)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            Paid
                          </span>
                        )}
                      </td>

                      {/* Last Activity Date */}
                      <td className="py-4 px-3 text-slate-500 text-xs font-mono">
                        {debtor.lastPaymentDate ? (
                          new Date(debtor.lastPaymentDate).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                          })
                        ) : (
                          new Date(debtor.updatedAt).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                          })
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-3 text-right space-x-1.5 whitespace-nowrap">
                        {isOwing && (
                          <button
                            onClick={() => setPayingDebtor(debtor)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        )}

                        <button
                          onClick={() => setInspectingDebtor(debtor)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>Statement</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    {searchQuery ? (
                      <div>
                        <p className="font-medium">No debtors match "{searchQuery}"</p>
                        <button
                          onClick={() => setSearchQuery('')}
                          className="mt-2 text-purple-600 font-semibold hover:underline"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                        <p className="font-semibold text-slate-600 text-sm">No credit customers recorded yet</p>
                        <p className="text-slate-400 mt-1 max-w-sm mx-auto">
                          When you make a sale and choose "Credit" at the POS checkout, the customer will automatically appear here with their balance.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modals ──────────────────────────────────────────────────────────── */}
      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={Boolean(payingDebtor)}
        onClose={() => setPayingDebtor(null)}
        debtor={payingDebtor}
      />

      {/* Debtor Details & Statements Modal */}
      <DebtorDetailsModal
        isOpen={Boolean(inspectingDebtor)}
        onClose={() => setInspectingDebtor(null)}
        debtor={inspectingDebtor}
      />
    </div>
  )
}
