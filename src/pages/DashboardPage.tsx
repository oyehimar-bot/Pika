import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import {
  useInventoryValuation,
  useTodaySales,
  useProducts,
  useExpiringBatches,
} from '@/hooks/useDatabase'
import { useAppSettings } from '@/context/AppSettingsContext'
import { formatCurrency, formatNumber } from '@/utils/currency'

export function DashboardPage() {
  const valuation = useInventoryValuation()
  const todaySales = useTodaySales()
  const products = useProducts()
  const expiringBatches = useExpiringBatches(14)
  const { showExpiry, storeName, businessMode, isNoExpiry } = useAppSettings()

  const bannerStyle = useMemo(() => {
    if (isNoExpiry) {
      return {
        bg: 'from-sky-800 via-blue-900 to-slate-950 shadow-sky-950/40 border-sky-500/20',
        badge: 'Non-Expiry Mode (Durable Goods)',
        subtitle: 'Real-time stock valuation, durable inventory management, dynamic POS checkout, and zero-data-loss sovereignty.',
        primaryBtn: 'bg-white text-sky-950 font-bold hover:bg-sky-50',
        primaryBtnIcon: 'text-sky-700',
        secondaryBtn: 'bg-sky-600/40 hover:bg-sky-600/60',
        decor1: 'bg-sky-500/10',
        decor2: 'bg-blue-500/10',
      }
    } else if (businessMode === 'expiry_only') {
      return {
        bg: 'from-emerald-800 via-teal-900 to-slate-950 shadow-emerald-950/40 border-emerald-500/20',
        badge: 'Perishable FIFO Mode (Strict Expiry)',
        subtitle: 'Real-time stock valuation, strict FIFO costing, automated expiration monitoring, and zero-data-loss sovereignty.',
        primaryBtn: 'bg-white text-emerald-950 font-bold hover:bg-emerald-50',
        primaryBtnIcon: 'text-emerald-700',
        secondaryBtn: 'bg-emerald-600/40 hover:bg-emerald-600/60',
        decor1: 'bg-emerald-500/10',
        decor2: 'bg-teal-500/10',
      }
    } else {
      return {
        bg: 'from-purple-700 via-purple-800 to-slate-900 shadow-purple-950/40 border-purple-500/20',
        badge: 'Hybrid Store (All Inventory)',
        subtitle: 'Real-time stock valuation, strict FIFO costing, dynamic POS checkout, and zero-data-loss sovereignty.',
        primaryBtn: 'bg-white text-purple-900 font-bold hover:bg-purple-50',
        primaryBtnIcon: 'text-purple-700',
        secondaryBtn: 'bg-purple-600/40 hover:bg-purple-600/60',
        decor1: 'bg-purple-500/10',
        decor2: 'bg-indigo-500/10',
      }
    }
  }, [businessMode, isNoExpiry])

  const topProducts = products
    ? [...products].sort((a, b) => b.totalStock - a.totalStock).slice(0, 5)
    : []

  const highestValueProducts = products
    ? [...products].sort((a, b) => b.totalValue - a.totalValue).slice(0, 5)
    : []

  const metrics = [
    {
      label: 'Today Revenue',
      value: formatCurrency(todaySales?.totalRevenue || 0),
      change: `${todaySales?.count ?? 0} sales recorded`,
      changeType: 'up' as const,
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      bgDark: 'dark:bg-emerald-950/30',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Products in Catalog',
      value: `${valuation?.totalProducts ?? 0}`,
      change: `${formatNumber(valuation?.totalUnits ?? 0)} total units`,
      changeType: 'neutral' as const,
      icon: Package,
      color: isNoExpiry
        ? 'from-sky-500 to-blue-700'
        : businessMode === 'expiry_only'
        ? 'from-emerald-500 to-teal-700'
        : 'from-purple-500 to-purple-700',
      bgLight: isNoExpiry
        ? 'bg-sky-50'
        : businessMode === 'expiry_only'
        ? 'bg-emerald-50'
        : 'bg-purple-50',
      bgDark: isNoExpiry
        ? 'dark:bg-sky-950/30'
        : businessMode === 'expiry_only'
        ? 'dark:bg-emerald-950/30'
        : 'dark:bg-purple-950/30',
      textColor: isNoExpiry
        ? 'text-sky-600 dark:text-sky-400'
        : businessMode === 'expiry_only'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Inventory FIFO Value',
      value: formatCurrency(valuation?.totalCostValue || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      change: `${formatCurrency(valuation?.potentialProfit || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} projected profit`,
      changeType: 'up' as const,
      icon: TrendingUp,
      color: isNoExpiry
        ? 'from-sky-600 to-blue-800'
        : businessMode === 'expiry_only'
        ? 'from-emerald-600 to-teal-800'
        : 'from-purple-600 to-indigo-600',
      bgLight: isNoExpiry
        ? 'bg-sky-50'
        : businessMode === 'expiry_only'
        ? 'bg-emerald-50'
        : 'bg-purple-50',
      bgDark: isNoExpiry
        ? 'dark:bg-sky-950/30'
        : businessMode === 'expiry_only'
        ? 'dark:bg-emerald-950/30'
        : 'dark:bg-purple-950/30',
      textColor: isNoExpiry
        ? 'text-sky-600 dark:text-sky-400'
        : businessMode === 'expiry_only'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Low Stock Alerts',
      value: `${valuation?.lowStockCount ?? 0}`,
      change: valuation && valuation.lowStockCount > 0 ? 'Requires restock' : 'Healthy stock levels',
      changeType: valuation && valuation.lowStockCount > 0 ? ('down' as const) : ('neutral' as const),
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50',
      bgDark: 'dark:bg-amber-950/30',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome banner */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${bannerStyle.bg} p-6 md:p-8 text-white shadow-2xl border`}>
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold mb-3">
            <span>🐹 {storeName || 'Pika SME Enterprise'}</span>
            <span className="opacity-40">•</span>
            <span>{bannerStyle.badge}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Live Business Intelligence
          </h1>
          <p className="mt-2 text-surface-200 text-sm leading-relaxed">
            {bannerStyle.subtitle}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/inventory"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${bannerStyle.primaryBtn} text-sm transition-colors shadow-lg shadow-black/20`}
            >
              <Package className={`w-4 h-4 ${bannerStyle.primaryBtnIcon}`} />
              Manage Inventory
            </Link>
            <Link
              to="/pos"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${bannerStyle.secondaryBtn} text-white font-semibold text-sm transition-colors backdrop-blur-sm border border-white/20`}
            >
              <ShoppingCart className="w-4 h-4" />
              Launch POS Checkout
            </Link>
          </div>
        </div>
        {/* Decorative elements */}
        <div className={`absolute -right-8 -top-8 w-48 h-48 rounded-full ${bannerStyle.decor1} pointer-events-none blur-xl`} />
        <div className={`absolute -right-4 top-12 w-28 h-28 rounded-full ${bannerStyle.decor2} pointer-events-none`} />
        <div className={`absolute right-24 -bottom-6 w-36 h-36 rounded-full ${bannerStyle.decor1} pointer-events-none`} />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div
              key={metric.label}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 shadow-sm hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl ${metric.bgLight} ${metric.bgDark}`}>
                  <Icon className={`w-5 h-5 ${metric.textColor}`} />
                </div>
                <span
                  className={`text-xs font-medium ${
                    metric.changeType === 'down'
                      ? 'text-amber-500'
                      : metric.changeType === 'up'
                      ? 'text-emerald-500'
                      : 'text-surface-400'
                  }`}
                >
                  {metric.change}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-surface-900 dark:text-white font-mono">
                  {metric.value}
                </p>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                  {metric.label}
                </p>
              </div>
              <div
                className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${metric.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />
            </div>
          )
        })}
      </div>

      {/* Quick stats cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stock Items */}
        <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Highest Quantity Items
            </h3>
            <Link
              to="/inventory"
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              View Catalog <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {topProducts.length > 0 ? (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {topProducts.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0 flex items-center gap-2.5">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                      {p.sku}
                    </span>
                    <span className="font-medium text-sm text-surface-900 dark:text-white truncate">
                      {p.name}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="text-sm font-bold text-surface-900 dark:text-white font-mono">
                      {p.totalStock} {p.unit}s
                    </span>
                    <span className="text-xs text-surface-400 block font-mono">
                      {formatCurrency(p.totalValue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-surface-400 text-center">
              <Package className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">No inventory recorded</p>
            </div>
          )}
        </div>

        {/* Dynamic Expiry Lots OR High Value Valuation */}
        {showExpiry ? (
          <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-500" />
                Near-Expiry Lots (14 Days)
              </h3>
              <span className="text-xs text-surface-400 font-medium">Automated FIFO check</span>
            </div>

            {expiringBatches && expiringBatches.length > 0 ? (
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {expiringBatches.map((w) => (
                  <div key={w.batchId} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {w.batchNumber}
                        </span>
                        <span className="text-sm font-medium text-surface-900 dark:text-white">
                          {w.productName}
                        </span>
                      </div>
                      <span className="text-xs text-surface-400 block mt-0.5">
                        Expires in {w.daysUntilExpiry} day{w.daysUntilExpiry === 1 ? '' : 's'} ({new Date(w.expiryDate).toLocaleDateString()})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 font-mono">
                        {w.remainingQty} units left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-surface-400 text-center">
                <Clock className="w-10 h-10 mb-2 opacity-30 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  All active stock lots are fresh
                </p>
                <p className="text-xs text-surface-400 mt-1">
                  Zero expired or near-expiry batches detected across all active lots.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* When business mode is without expiry, display top valuable capital assets */
          <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                Top Capital Assets (By Inventory Value)
              </h3>
              <span className="text-xs text-surface-400 font-medium">Non-Perishable Assets</span>
            </div>

            {highestValueProducts.length > 0 ? (
              <div className="divide-y divide-surface-100 dark:divide-surface-800">
                {highestValueProducts.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-purple-600 dark:text-purple-400">
                          {p.sku}
                        </span>
                        <span className="text-sm font-medium text-surface-900 dark:text-white">
                          {p.name}
                        </span>
                      </div>
                      <span className="text-xs text-surface-400 block mt-0.5">
                        {p.totalStock} {p.unit}s in stock @ ~{formatCurrency(p.suggestedSellingPrice || 0)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(p.totalValue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-surface-400 text-center">
                <ShieldCheck className="w-10 h-10 mb-2 opacity-30 text-purple-500" />
                <p className="text-sm font-medium text-purple-400">
                  Inventory Healthy & Balanced
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
