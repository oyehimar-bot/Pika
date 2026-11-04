import { useLocation } from 'react-router-dom'
import { Menu, Bell, Moon, Sun, ChevronDown } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { useAppSettings } from '@/context/AppSettingsContext'
import { PinAuthModal } from '@/components/auth/PinAuthModal'

interface HeaderProps {
  onMenuClick: () => void
  sidebarCollapsed: boolean
}

const routeDetails: Record<string, { title: string; crumb: string }> = {
  '/dashboard': { title: 'Dashboard', crumb: 'Dashboard' },
  '/inventory': { title: 'Inventory', crumb: 'Inventory' },
  '/pos': { title: 'Point of Sale', crumb: 'Point of Sale' },
  '/receipts': { title: 'Receipt History', crumb: 'Receipts' },
  '/sales': { title: 'Report Analytics', crumb: 'Analytics' },
  '/audit': { title: 'User Authentication', crumb: 'Audit Trail' },
  '/settings': { title: 'Settings', crumb: 'Settings' },
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const { currentStaff, setIsPinModalOpen } = useAuth()
  const { storeName } = useAppSettings()
  const location = useLocation()
  const currentRoute = routeDetails[location.pathname] ?? { title: 'Pika', crumb: 'App' }

  return (
    <>
      <header className="h-20 px-6 md:px-8 bg-white border-b border-slate-200 flex items-center justify-between no-print print:hidden">
        {/* Left: Mobile Menu + Page Header / Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base font-semibold text-slate-900 leading-none">
              {currentRoute.title}
            </h1>
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
              <span>Home</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600 font-semibold">{currentRoute.crumb}</span>
            </nav>
          </div>
        </div>

        {/* Right: Store Switcher Pill, Notifications, User Profile */}
        <div className="flex items-center gap-3">
          {/* Store / Shop Switcher Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 cursor-default">
            <span className="max-w-[130px] truncate">{storeName || 'Pika Shop'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Notification Bell */}
          <button
            className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-600 ring-2 ring-white" />
          </button>

          {/* User Profile Pill / Button */}
          <button
            onClick={() => setIsPinModalOpen(true)}
            className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            title="Switch staff profile (PIN)"
          >
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-semibold overflow-hidden shadow-sm">
              {currentStaff?.name ? currentStaff.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden md:block text-left">
              <span className="text-xs font-semibold text-slate-800 block leading-tight">
                {currentStaff?.name || 'Staff'}
              </span>
              <span className="text-[10px] text-slate-400 capitalize block leading-tight">
                {currentStaff?.role || 'User'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
          </button>
        </div>
      </header>

      {/* PIN Authentication Modal */}
      <PinAuthModal />
    </>
  )
}
