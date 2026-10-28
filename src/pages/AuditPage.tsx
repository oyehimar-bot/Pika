import { Shield, Clock, User, Filter, Search } from 'lucide-react'

export function AuditPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Audit Trail
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            Immutable log of all sales, stock edits, and system events
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 text-sm hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          placeholder="Search audit logs..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-pika-500/50 focus:border-pika-500 transition-all"
        />
      </div>

      {/* Empty state */}
      <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm">
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="p-4 rounded-2xl bg-surface-100 dark:bg-surface-800 mb-4">
            <Shield className="w-10 h-10 text-pika-500" />
          </div>
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
            No audit events yet
          </h3>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1 max-w-sm text-center">
            All sales, stock adjustments, and administrative actions will be
            recorded here with timestamps and user attribution.
          </p>
          <div className="mt-6 flex items-center gap-6 text-xs text-surface-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Timestamp tracking
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              User attribution
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Immutable logs
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

