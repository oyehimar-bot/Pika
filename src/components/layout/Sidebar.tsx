import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'

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
  { to: '/audit', label: 'Audit Trail', icon: Shield },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation()

  const sidebarClasses = [
    'fixed lg:relative inset-y-0 left-0 z-50 flex flex-col',
    'bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800',
    'transition-all duration-300 ease-in-out',
    collapsed ? 'w-[72px]' : 'w-64',
    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
  ].join(' ')

  return (
    <aside className={sidebarClasses}>
      {/* Logo area */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-surface-200 dark:border-surface-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <img
              src="/pika-logo.png"
              alt="Pika"
              className="w-9 h-9 rounded-lg object-contain"
            />
            <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-br from-pika-500 to-pika-700 opacity-20 blur-sm -z-10" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-xl font-bold bg-gradient-to-r from-pika-500 to-pika-700 bg-clip-text text-transparent">
                Pika
              </h1>
              <p className="text-[10px] font-medium text-surface-500 dark:text-surface-400 tracking-wider uppercase">
                Inventory
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 lg:hidden transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to

          return (
            <NavLink
              key={to}
              to={to}
              onClick={onMobileClose}
              className={[
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-pika-600 to-pika-700 text-white shadow-lg shadow-pika-700/25'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
              title={collapsed ? label : undefined}
            >
              <Icon
                className={[
                  'w-5 h-5 flex-shrink-0 transition-transform duration-200',
                  !isActive ? 'group-hover:scale-110' : '',
                ].join(' ')}
              />
              {!collapsed && (
                <span className="truncate animate-fade-in">{label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 animate-scale-in" />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden lg:flex items-center justify-center p-3 border-t border-surface-200 dark:border-surface-800">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-pika-600 transition-all duration-200"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  )
}

