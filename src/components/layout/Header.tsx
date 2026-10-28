import { useLocation } from 'react-router-dom'
import { Menu, Bell, Search, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

interface HeaderProps {
  onMenuClick: () => void
  sidebarCollapsed: boolean
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your business metrics' },
  '/inventory': { title: 'Inventory', subtitle: 'Manage products, batches & stock levels' },
  '/pos': { title: 'Point of Sale', subtitle: 'Fast checkout & receipt generation' },
  '/audit': { title: 'Audit Trail', subtitle: 'Activity logs & security events' },
  '/settings': { title: 'Settings', subtitle: 'App preferences & data management' },
}

export function Header({ onMenuClick }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const page = pageTitles[location.pathname] ?? { title: 'Pika', subtitle: '' }

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 border-b border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Page title */}
        <div className="animate-slide-in">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
            {page.title}
          </h2>
          <p className="text-xs text-surface-500 dark:text-surface-400 hidden sm:block">
            {page.subtitle}
          </p>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="p-2 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-pika-600 dark:hover:text-pika-400 transition-colors">
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-pika-600 dark:hover:text-pika-400 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pika-500 ring-2 ring-white dark:ring-surface-900" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-pika-600 dark:hover:text-pika-400 transition-all duration-300"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 transition-transform duration-300 hover:rotate-45" />
          ) : (
            <Moon className="w-5 h-5 transition-transform duration-300 hover:-rotate-12" />
          )}
        </button>

        {/* User avatar */}
        <button className="ml-2 flex items-center gap-2 p-1 pr-3 rounded-full bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pika-500 to-pika-700 flex items-center justify-center text-white text-sm font-bold shadow-md">
            P
          </div>
          <span className="text-sm font-medium text-surface-700 dark:text-surface-300 hidden md:block">
            Admin
          </span>
        </button>
      </div>
    </header>
  )
}

