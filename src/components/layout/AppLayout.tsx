import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 text-surface-900 dark:bg-surface-950 dark:text-surface-100 transition-colors duration-300 print:h-auto print:overflow-visible print:bg-white print:text-black">
      {/* Dynamic SME Onboarding Setup Modal */}
      <div className="no-print print:hidden">
        <OnboardingModal />
      </div>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden no-print print:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible print:h-auto print:block">
        <Header
          onMenuClick={() => setMobileSidebarOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 print:p-0 print:m-0 print:overflow-visible print:h-auto print:block">
          <div className="mx-auto max-w-7xl animate-fade-in print:max-w-none print:m-0 print:p-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
