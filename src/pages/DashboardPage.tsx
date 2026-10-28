import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react'

const metrics = [
  {
    label: 'Total Revenue',
    value: '₦0.00',
    change: '+0%',
    changeType: 'up' as 'up' | 'down' | 'neutral',
    icon: DollarSign,
    color: 'from-emerald-500 to-emerald-600',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/30',
    textColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'Products in Stock',
    value: '0',
    change: '0 items',
    changeType: 'neutral' as 'up' | 'down' | 'neutral',
    icon: Package,
    color: 'from-pika-500 to-pika-700',
    bgLight: 'bg-pika-50',
    bgDark: 'dark:bg-pika-950/30',
    textColor: 'text-pika-600 dark:text-pika-400',
  },
  {
    label: 'Sales Today',
    value: '0',
    change: '0 transactions',
    changeType: 'neutral' as 'up' | 'down' | 'neutral',
    icon: ShoppingCart,
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-950/30',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    label: 'Low Stock Alerts',
    value: '0',
    change: 'All clear',
    changeType: 'neutral' as 'up' | 'down' | 'neutral',
    icon: AlertTriangle,
    color: 'from-amber-500 to-orange-500',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-950/30',
    textColor: 'text-amber-600 dark:text-amber-400',
  },
]

export function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pika-600 via-pika-700 to-pika-900 p-6 md:p-8 text-white shadow-2xl shadow-pika-700/20">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold">
            Welcome to Pika 🐹
          </h1>
          <p className="mt-2 text-pika-100 max-w-lg">
            Your local-first inventory management system is ready. Start by adding your
            products and batches to get real-time insights.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="px-4 py-2 rounded-xl bg-white text-pika-700 font-semibold text-sm hover:bg-pika-50 transition-colors shadow-lg">
              Add Product
            </button>
            <button className="px-4 py-2 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors backdrop-blur-sm border border-white/20">
              Quick Sale
            </button>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 top-8 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute right-20 -bottom-6 w-32 h-32 rounded-full bg-white/5" />
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
                {metric.changeType === 'up' && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-500">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {metric.change}
                  </span>
                )}
                {metric.changeType === 'down' && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-red-500">
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    {metric.change}
                  </span>
                )}
                {metric.changeType === 'neutral' && (
                  <span className="text-xs font-medium text-surface-400">
                    {metric.change}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-surface-900 dark:text-white">
                  {metric.value}
                </p>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
                  {metric.label}
                </p>
              </div>
              {/* Bottom gradient accent */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${metric.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            </div>
          )
        })}
      </div>

      {/* Quick stats cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast-moving items placeholder */}
        <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-pika-500" />
              Fast-Moving Items
            </h3>
            <span className="text-xs text-surface-400 font-medium">Last 7 days</span>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-surface-400">
            <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No sales data yet</p>
            <p className="text-xs mt-1">Complete some sales to see trends</p>
          </div>
        </div>

        {/* Inventory value placeholder */}
        <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-pika-500" />
              Inventory Value
            </h3>
            <span className="text-xs text-surface-400 font-medium">FIFO valuation</span>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-surface-400">
            <DollarSign className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No inventory data yet</p>
            <p className="text-xs mt-1">Add products to calculate value</p>
          </div>
        </div>
      </div>
    </div>
  )
}

