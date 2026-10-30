import { useState } from 'react'
import {
  TrendingUp,
  DollarSign,
  Calendar,
  BarChart3,
  CreditCard,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Download,
  Percent,
  Clock,
  Lock,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { useSalesAnalytics } from '@/hooks/useDatabase'
import { useAuth } from '@/context/AuthContext'
import type { SalesTimeframePreset } from '@/db'
import { formatCurrency, formatNumber } from '@/utils/currency'

export function SalesAnalyticsPage() {
  const { currentStaff, setIsPinModalOpen } = useAuth()
  const isAdmin = currentStaff?.role === 'admin'

  const [preset, setPreset] = useState<SalesTimeframePreset>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily')

  // Enforce strict 'today' timeframe for non-admin staff
  const effectivePreset: SalesTimeframePreset = isAdmin ? preset : 'today'
  const effectiveStart = isAdmin && preset === 'custom' && customStart ? new Date(customStart) : null
  const effectiveEnd = isAdmin && preset === 'custom' && customEnd ? new Date(customEnd) : null

  const analytics = useSalesAnalytics(effectivePreset, effectiveStart, effectiveEnd)

  const kpis = analytics?.kpis
  const todaySummary = analytics?.todaySummary
  const yesterdaySummary = analytics?.yesterdaySummary
  const currentMonthSummary = analytics?.currentMonthSummary
  const previousMonthSummary = analytics?.previousMonthSummary
  const paymentMethods = analytics?.paymentBreakdown || []
  const dailyBreakdown = analytics?.dailyBreakdown || []
  const monthlyBreakdown = analytics?.monthlyBreakdown || []

  // Day over Day calculation (Admin only)
  const dayOverDayDiff =
    isAdmin && todaySummary && yesterdaySummary && yesterdaySummary.totalRevenue > 0
      ? Math.round(
          ((todaySummary.totalRevenue - yesterdaySummary.totalRevenue) /
            yesterdaySummary.totalRevenue) *
            1000
        ) / 10
      : null

  // Month over Month calculation (Admin only)
  const monthOverMonthDiff =
    isAdmin && currentMonthSummary && previousMonthSummary && previousMonthSummary.totalRevenue > 0
      ? Math.round(
          ((currentMonthSummary.totalRevenue - previousMonthSummary.totalRevenue) /
            previousMonthSummary.totalRevenue) *
            1000
        ) / 10
      : null

  // Maximum revenue in daily breakdown for chart scaling
  const maxDailyRevenue = Math.max(
    1,
    ...dailyBreakdown.map((d) => d.revenue)
  )

  // Visible daily breakdown: Non-admin staff only see today's row
  const todayDateKey = new Date().toISOString().slice(0, 10)
  const visibleDailyBreakdown = isAdmin
    ? dailyBreakdown
    : dailyBreakdown.filter((d) => d.dateKey === todayDateKey)

  // Export financial report CSV (Admin only)
  const handleExportReport = () => {
    if (!analytics || !isAdmin) return

    let csv = `Pika SME Sales Analytics Report (${preset})\n`
    csv += `Exported At: ${new Date().toISOString()}\n`
    csv += `Staff: ${currentStaff?.name ?? 'Admin'} (Role: ${currentStaff?.role ?? 'admin'})\n\n`

    csv += `KPI SUMMARY\n`
    csv += `Gross Revenue,${analytics.kpis.totalRevenue}\n`
    csv += `FIFO Cost of Goods Sold,${analytics.kpis.totalCost}\n`
    csv += `Net Profit,${analytics.kpis.netProfit}\n`
    csv += `Profit Margin,${analytics.kpis.profitMargin}%\n`
    csv += `Transactions,${analytics.kpis.transactionCount}\n`
    csv += `Units Sold,${analytics.kpis.itemsSold}\n`
    csv += `Average Order Value,${analytics.kpis.averageOrderValue}\n\n`

    csv += `DAILY BREAKDOWN\n`
    csv += `Date,Day,Transactions,Revenue (NGN),Cost (NGN),Net Profit (NGN),Margin (%)\n`
    for (const d of dailyBreakdown) {
      csv += `${d.dateKey},${d.dayName},${d.transactionCount},${d.revenue},${d.cost},${d.profit},${d.profitMargin}%\n`
    }

    csv += `\nMONTHLY COMPARATIVE BREAKDOWN\n`
    csv += `Month,Transactions,Revenue (NGN),Cost (NGN),Net Profit (NGN),Margin (%),Avg Daily Revenue (NGN)\n`
    for (const m of monthlyBreakdown) {
      csv += `"${m.monthLabel}",${m.transactionCount},${m.revenue},${m.cost},${m.profit},${m.profitMargin}%,${m.averageDailyRevenue}\n`
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `pika-sales-analytics-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              Sales Performance & Profit Analytics
            </h1>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Full Access
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40">
                <ShieldAlert className="w-3.5 h-3.5" />
                Staff Mode (Today Only)
              </span>
            )}
          </div>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {isAdmin
              ? 'Real-time daily & monthly revenue, strict FIFO net profit costing, and payment channel insights'
              : "Live sales volume, order counts, and payment channel insights for today"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-xs font-bold hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors shadow-sm"
              title="Download full analytics CSV report"
            >
              <Download className="w-4 h-4 text-purple-500" />
              <span>Export Analytics CSV</span>
            </button>
          ) : (
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-sm"
              title="Authenticate with Admin PIN to unlock historical analytics"
            >
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Switch to Admin PIN</span>
            </button>
          )}
        </div>
      </div>

      {/* Staff Role Limitation Alert Banner */}
      {!isAdmin && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Staff Access: Today's Sales Only
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 font-semibold">
                  Restricted
                </span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Multi-day historical reports, monthly comparative charts, FIFO cost analysis, and net profit margins require Admin authentication.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPinModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 flex-shrink-0"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Unlock Admin View</span>
          </button>
        </div>
      )}

      {/* Timeframe Presets Filter Bar */}
      {isAdmin ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className="text-surface-400 px-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-500" /> Timeframe:
            </span>
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'last_30_days', label: 'Last 30 Days' },
                { id: 'custom', label: 'Custom Range' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setPreset(t.id)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  preset === t.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 text-xs pr-2 animate-fade-in">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-800 dark:text-surface-200"
              />
              <span className="text-surface-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-800 dark:text-surface-200"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm text-xs">
          <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300 font-semibold">
            <Clock className="w-4 h-4 text-purple-500" />
            <span>Active Scope:</span>
            <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-bold shadow-sm shadow-purple-600/30">
              Today ({new Date().toLocaleDateString('en-NG', { dateStyle: 'medium' })})
            </span>
          </div>
          <span className="text-[11px] text-surface-400 italic">
            Historical timeframes locked for staff
          </span>
        </div>
      )}

      {/* Top Core KPI Cards */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'} gap-4`}>
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isAdmin ? 'Gross Revenue' : "Today's Revenue"}
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-surface-900 dark:text-white font-mono block">
              {formatCurrency(kpis?.totalRevenue || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs text-surface-500 dark:text-surface-400 mt-1 block">
              {formatNumber(kpis?.transactionCount || 0)} completed order{kpis?.transactionCount === 1 ? '' : 's'}
              {!isAdmin && " today"}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
        </div>

        {/* Net Profit (FIFO Basis) — Admin Only */}
        {isAdmin && (
          <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
              <span className="text-xs font-semibold uppercase tracking-wider">True Net Profit</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono block">
                {formatCurrency(kpis?.netProfit || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-500 font-semibold mt-1 block">
                FIFO Lot Cost: {formatCurrency(kpis?.totalCost || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          </div>
        )}

        {/* Profit Margin — Admin Only */}
        {isAdmin && (
          <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Gross Margin</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono block">
                {kpis?.profitMargin || 0}%
              </span>
              <span className="text-xs text-surface-500 dark:text-surface-400 mt-1 block">
                Net return on stock sold
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-sky-600" />
          </div>
        )}

        {/* Average Basket Size */}
        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-surface-500 dark:text-surface-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Order Value</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono block">
              {formatCurrency(kpis?.averageOrderValue || 0)}
            </span>
            <span className="text-xs text-surface-500 dark:text-surface-400 mt-1 block">
              {formatNumber(kpis?.itemsSold || 0)} items dispatched
              {!isAdmin && " today"}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600" />
        </div>
      </div>

      {/* Day & Month Comparison Banners */}
      {isAdmin ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Daily Summary Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
              <div>
                <h3 className="font-bold text-sm text-surface-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-500" />
                  Daily Sales Snapshot
                </h3>
                <p className="text-xs text-surface-400">Today vs. Yesterday</p>
              </div>
              {dayOverDayDiff !== null && (
                <span
                  className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    dayOverDayDiff >= 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  }`}
                >
                  {dayOverDayDiff >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {dayOverDayDiff > 0 ? '+' : ''}
                  {dayOverDayDiff}% DoD
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3">
              <div>
                <span className="text-xs text-surface-400 block font-medium">Today's Revenue</span>
                <span className="text-xl font-bold font-mono text-surface-900 dark:text-white block mt-0.5">
                  {formatCurrency(todaySummary?.totalRevenue || 0)}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
                  Profit: {formatCurrency(todaySummary?.netProfit || 0)}
                </span>
                <span className="text-[10px] text-surface-400 mt-0.5 block">
                  {todaySummary?.transactionCount || 0} order(s)
                </span>
              </div>

              <div>
                <span className="text-xs text-surface-400 block font-medium">Yesterday's Revenue</span>
                <span className="text-xl font-bold font-mono text-surface-600 dark:text-surface-300 block mt-0.5">
                  {formatCurrency(yesterdaySummary?.totalRevenue || 0)}
                </span>
                <span className="text-[11px] text-surface-500 font-semibold mt-0.5 block">
                  Profit: {formatCurrency(yesterdaySummary?.netProfit || 0)}
                </span>
                <span className="text-[10px] text-surface-400 mt-0.5 block">
                  {yesterdaySummary?.transactionCount || 0} order(s)
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Summary Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
              <div>
                <h3 className="font-bold text-sm text-surface-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  Monthly Sales Snapshot
                </h3>
                <p className="text-xs text-surface-400">Current Month vs. Previous Month</p>
              </div>
              {monthOverMonthDiff !== null && (
                <span
                  className={`inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    monthOverMonthDiff >= 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  }`}
                >
                  {monthOverMonthDiff >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {monthOverMonthDiff > 0 ? '+' : ''}
                  {monthOverMonthDiff}% MoM
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3">
              <div>
                <span className="text-xs text-surface-400 block font-medium">This Month's Revenue</span>
                <span className="text-xl font-bold font-mono text-surface-900 dark:text-white block mt-0.5">
                  {formatCurrency(currentMonthSummary?.totalRevenue || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
                  Profit: {formatCurrency(currentMonthSummary?.netProfit || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-surface-400 mt-0.5 block">
                  {currentMonthSummary?.transactionCount || 0} order(s)
                </span>
              </div>

              <div>
                <span className="text-xs text-surface-400 block font-medium">Previous Month's Revenue</span>
                <span className="text-xl font-bold font-mono text-surface-600 dark:text-surface-300 block mt-0.5">
                  {formatCurrency(previousMonthSummary?.totalRevenue || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[11px] text-surface-500 font-semibold mt-0.5 block">
                  Profit: {formatCurrency(previousMonthSummary?.netProfit || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
                <span className="text-[10px] text-surface-400 mt-0.5 block">
                  {previousMonthSummary?.transactionCount || 0} order(s)
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Staff Simple Snapshot Card */
        <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
            <div>
              <h3 className="font-bold text-sm text-surface-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                Today's Checkout Velocity
              </h3>
              <p className="text-xs text-surface-400">Active shift sales activity</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
              Shift Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3">
            <div>
              <span className="text-xs text-surface-400 block font-medium">Today's Revenue</span>
              <span className="text-2xl font-bold font-mono text-surface-900 dark:text-white block mt-0.5">
                {formatCurrency(todaySummary?.totalRevenue || 0)}
              </span>
            </div>

            <div>
              <span className="text-xs text-surface-400 block font-medium">Completed Transactions</span>
              <span className="text-2xl font-bold font-mono text-surface-900 dark:text-white block mt-0.5">
                {todaySummary?.transactionCount || 0}
              </span>
            </div>

            <div>
              <span className="text-xs text-surface-400 block font-medium">Items Dispatched</span>
              <span className="text-2xl font-bold font-mono text-surface-900 dark:text-white block mt-0.5">
                {todaySummary?.itemsSold || 0} units
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Distribution Breakdown */}
      <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
        <h3 className="font-bold text-sm text-surface-900 dark:text-white flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-purple-500" />
          Payment Channel Revenue Share {isAdmin ? '' : "(Today)"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {paymentMethods.map((p) => {
            const Icon =
              p.method === 'card'
                ? CreditCard
                : p.method === 'transfer'
                ? Building
                : DollarSign

            return (
              <div
                key={p.method}
                className="p-3.5 rounded-xl border border-surface-200 dark:border-surface-700/80 bg-surface-50/60 dark:bg-surface-800/40 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-surface-800 dark:text-surface-100">
                    <Icon className="w-4 h-4 text-purple-500" />
                    <span>{p.label}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                    {p.percentage}%
                  </span>
                </div>
                <div className="w-full bg-surface-200 dark:bg-surface-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, p.percentage))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-surface-400">{p.count} transaction{p.count === 1 ? '' : 's'}</span>
                  <span className="font-mono font-bold text-surface-900 dark:text-white">
                    {formatCurrency(p.revenue)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Historical Breakdown Section */}
      <div className="space-y-4">
        {/* View Switcher Tabs (Admin Only) */}
        {isAdmin ? (
          <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('daily')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'daily'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                    : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Daily Sales Breakdown ({dailyBreakdown.length} days)</span>
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'monthly'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25'
                    : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Monthly Comparative Summary ({monthlyBreakdown.length} months)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-800 pb-2">
            <h3 className="font-bold text-sm text-surface-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              <span>Today's Transaction Record</span>
            </h3>
          </div>
        )}

        {/* Tab 1: Daily Sales Breakdown */}
        {(activeTab === 'daily' || !isAdmin) && (
          <div className="space-y-4">
            {/* Visual Bar representation of Daily Sales (Admin Only) */}
            {isAdmin && dailyBreakdown.length > 0 && (
              <div className="p-5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
                <h4 className="text-xs font-bold text-surface-700 dark:text-surface-200 mb-4 flex items-center justify-between">
                  <span>Daily Revenue Trend</span>
                  <span className="text-[11px] text-surface-400 font-normal">
                    Peak: {formatCurrency(maxDailyRevenue)}
                  </span>
                </h4>
                <div className="flex items-end gap-2 h-36 pt-4 pb-2 overflow-x-auto scrollbar-none">
                  {[...dailyBreakdown].reverse().map((day) => {
                    const heightPercent = Math.min(
                      100,
                      Math.max(12, Math.round((day.revenue / maxDailyRevenue) * 100))
                    )

                    return (
                      <div
                        key={day.dateKey}
                        className="flex-1 min-w-[48px] max-w-[64px] flex flex-col items-center gap-1.5 group relative"
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-surface-900 text-white text-[10px] py-1 px-2 rounded-lg shadow-xl whitespace-nowrap pointer-events-none">
                          <span className="font-bold">{day.dateLabel}</span>
                          <span className="text-emerald-400 font-mono">
                            {formatCurrency(day.revenue)}
                          </span>
                        </div>

                        {/* Bar */}
                        <div className="w-full bg-surface-100 dark:bg-surface-800/80 rounded-t-lg h-28 flex items-end p-0.5">
                          <div
                            className="w-full bg-gradient-to-t from-purple-700 to-indigo-500 hover:from-purple-600 hover:to-indigo-400 rounded-t-md transition-all duration-300"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>

                        {/* Date Label */}
                        <span className="text-[10px] text-surface-500 font-semibold truncate">
                          {day.dateLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Daily Table */}
            {visibleDailyBreakdown.length > 0 ? (
              <div className="overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50/70 dark:bg-surface-900/70 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Date & Day</th>
                        <th className="py-3.5 px-4 text-center">Orders</th>
                        <th className="py-3.5 px-4 text-right">Gross Revenue (₦)</th>
                        {isAdmin && <th className="py-3.5 px-4 text-right">FIFO Cost (₦)</th>}
                        {isAdmin && <th className="py-3.5 px-4 text-right">Net Profit (₦)</th>}
                        {isAdmin && <th className="py-3.5 px-4 text-center">Margin</th>}
                        <th className="py-3.5 px-4 text-right">Top Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                      {visibleDailyBreakdown.map((row) => (
                        <tr
                          key={row.dateKey}
                          className="hover:bg-surface-50/60 dark:hover:bg-surface-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-surface-900 dark:text-white">
                              {row.dateLabel}
                            </div>
                            <div className="text-[11px] text-surface-400">{row.dayName}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300">
                              {row.transactionCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-surface-900 dark:text-white">
                            {formatCurrency(row.revenue)}
                          </td>
                          {isAdmin && (
                            <td className="py-3.5 px-4 text-right font-mono text-surface-500">
                              {formatCurrency(row.cost)}
                            </td>
                          )}
                          {isAdmin && (
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(row.profit)}
                            </td>
                          )}
                          {isAdmin && (
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                  row.profitMargin >= 20
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                }`}
                              >
                                {row.profitMargin}%
                              </span>
                            </td>
                          )}
                          <td className="py-3.5 px-4 text-right text-xs text-surface-600 dark:text-surface-300 font-medium">
                            {row.topPaymentMethod || 'Cash'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-center text-surface-400 text-sm">
                No daily transaction activity recorded within this selected timeframe.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Monthly Comparative Summary (Admin Only) */}
        {isAdmin && activeTab === 'monthly' && (
          <div className="space-y-4">
            {monthlyBreakdown.length > 0 ? (
              <div className="overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-800 bg-surface-50/70 dark:bg-surface-900/70 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Calendar Month</th>
                        <th className="py-3.5 px-4 text-center">Total Orders</th>
                        <th className="py-3.5 px-4 text-right">Gross Revenue (₦)</th>
                        <th className="py-3.5 px-4 text-right">FIFO Cost (₦)</th>
                        <th className="py-3.5 px-4 text-right">Net Profit (₦)</th>
                        <th className="py-3.5 px-4 text-center">Net Margin</th>
                        <th className="py-3.5 px-4 text-right">Daily Run Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                      {monthlyBreakdown.map((row) => (
                        <tr
                          key={row.monthKey}
                          className="hover:bg-surface-50/60 dark:hover:bg-surface-800/40 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="font-bold text-surface-900 dark:text-white">
                              {row.monthLabel}
                            </div>
                            <div className="text-[11px] font-mono text-surface-400">
                              {row.monthKey}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                              {row.transactionCount} orders
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-surface-900 dark:text-white">
                            {formatCurrency(row.revenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-surface-500">
                            {formatCurrency(row.cost, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(row.profit, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {row.profitMargin}%
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right font-mono text-xs text-surface-700 dark:text-surface-300">
                            ~{formatCurrency(row.averageDailyRevenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/day
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-center text-surface-400 text-sm">
                No monthly sales records available yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
