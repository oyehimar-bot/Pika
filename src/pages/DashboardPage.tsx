import { Link } from 'react-router-dom'
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  DollarSign,
  Clock,
  ArrowRight,
} from 'lucide-react'
import {
  useInventoryValuation,
  useTodaySales,
  useProducts,
  useExpiringBatches,
} from '@/hooks/useDatabase'

export function DashboardPage() {
  const valuation = useInventoryValuation()
  const todaySales = useTodaySales()
  const products = useProducts()
  const expiringBatches = useExpiringBatches(14)

  const topProducts = products
    ? [...products].sort((a, b) => b.totalStock - a.totalStock).slice(0, 5)
    : []

  const metrics = [
    {
      label: 'Today Revenue',
      value: `₦${todaySales ? todaySales.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}`,
      change: `${todaySales?.count ?? 0} sales`,
      changeType: 'up' as const,
      icon: DollarSign,
      color: 'from-emerald-500 to-emerald-600',
      bgLight: 'bg-emerald-50',
      bgDark: 'dark:bg-emerald-950/30',
      textColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Products in Catalog',
      value: `${valuation?.totalProducts ?? 0}`,
      change: `${valuation?.totalUnits ?? 0} total units`,
      changeType: 'neutral' as const,
      icon: Package,
      color: 'from-pika-500 to-pika-700',
      bgLight: 'bg-pika-50',
      bgDark: 'dark:bg-pika-950/30',
      textColor: 'text-pika-600 dark:text-pika-400',
    },
    {
      label: 'Inventory FIFO Value',
      value: `₦${valuation ? valuation.totalCostValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}`,
      change: `₦${valuation ? valuation.potentialProfit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'} profit potential`,
      changeType: 'up' as const,
      icon: TrendingUp,
      color: 'from-purple-500 to-indigo-600',
      bgLight: 'bg-purple-50',
      bgDark: 'dark:bg-purple-950/30',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Low Stock Alerts',
      value: `${valuation?.lowStockCount ?? 0}`,
      change: valuation && valuation.lowStockCount > 0 ? 'Requires reorder' : 'Healthy stock',
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pika-600 via-pika-700 to-pika-900 p-6 md:p-8 text-white shadow-2xl shadow-pika-700/20">
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold mb-3">
            <span>🐹 Pika Local-First POS & Inventory</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Live Business Intelligence
          </h1>
          <p className="mt-2 text-pika-100 text-sm leading-relaxed">
            Real-time stock valuation, FIFO lot management, and rapid POS checkout designed for SMEs.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/inventory"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-pika-700 font-semibold text-sm hover:bg-pika-50 transition-colors shadow-lg"
            >
              <Package className="w-4 h-4" />
              Manage Inventory
            </Link>
            <Link
              to="/pos"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors backdrop-blur-sm border border-white/20"
            >
              <ShoppingCart className="w-4 h-4" />
              Launch POS Checkout
            </Link>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -right-4 top-12 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute right-24 -bottom-6 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div
              key={metric.label}
              className="group relative overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 shadow-sm hover:shadow-lg hover:shadow-pika-500/5 transition-all duration-300 hover:-translate-y-0.5"
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
                <p className="text-2xl font-bold text-surface-900 dark:text-white">
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
              <Package className="w-5 h-5 text-pika-500" />
              Stock Overview
            </h3>
            <Link
              to="/inventory"
              className="text-xs font-semibold text-pika-600 dark:text-pika-400 hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
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
                    <span className="text-sm font-bold text-surface-900 dark:text-white">
                      {p.totalStock} {p.unit}s
                    </span>
                    <span className="text-xs text-surface-400 block">
                      ₦{p.totalValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
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

        {/* Expiring Lots & Inventory Health */}
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
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
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
                All stock lots are fresh
              </p>
              <p className="text-xs text-surface-400 mt-1">No batches expiring in the next 14 days</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
