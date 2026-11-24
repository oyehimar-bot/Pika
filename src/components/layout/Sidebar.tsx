import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useAppSettings } from '@/context/AppSettingsContext'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/pos', label: 'Point of Sale', icon: ShoppingCart },
  { to: '/receipts', label: 'Receipt History', icon: Receipt },
  { to: '/sales', label: 'Report Analytics', icon: BarChart3 },
  { to: '/audit', label: 'User Authentication', icon: Shield },
  { to: '/settings', label: 'Setting', icon: Settings },
]

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation()
  const { setIsPinModalOpen } = useAuth()
  const { businessMode } = useAppSettings()

  const sidebarClasses = [
    'fixed lg:relative inset-y-0 left-0 z-50 flex flex-col',
    'bg-white border-r border-slate-200',
    'transition-all duration-200 ease-in-out',
    'no-print print:hidden',
    collapsed ? 'w-20' : 'w-64',
    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
  ].join(' ')

  return (
    <aside className={sidebarClasses}>
      {/* Brand Header */}
      <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <img
              src="/pika-logo.png"
              alt="Pika"
              className="w-8 h-8 rounded-lg object-contain"
            />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Pika
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    businessMode === 'no_expiry'
                      ? 'bg-sky-50 text-sky-600 border border-sky-200'
                      : businessMode === 'expiry_only'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-purple-50 text-purple-600 border border-purple-200'
                  }`}
                >
                  {businessMode === 'no_expiry' ? 'Durable' : businessMode === 'expiry_only' ? 'Perishable' : 'Hybrid'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to

          return (
            <NavLink
              key={to}
              to={to}
              onClick={onMobileClose}
              className={[
                'group flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
                collapsed ? 'justify-center px-0' : '',
              ].join(' ')}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={[
                  'w-5 h-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700',
                ].join(' ')}
              />
              {!collapsed && (
                <span className="truncate">{label}</span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Bottom Section: Logout & Collapse */}
      <div className="p-4 border-t border-slate-200 space-y-2">
        {/* Logout button */}
        <button
          onClick={() => setIsPinModalOpen(true)}
          className={[
            'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium',
            'text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors',
            collapsed ? 'justify-center px-0' : '',
          ].join(' ')}
          title="Logout / Switch Staff Session"
        >
          <LogOut className="w-5 h-5 flex-shrink-0 text-slate-400" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:flex items-center justify-end pt-1">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
