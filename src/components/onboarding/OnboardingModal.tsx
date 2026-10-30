import React, { useState } from 'react'
import {
  Package,
  CalendarClock,
  Layers,
  Sparkles,
  CheckCircle2,
  Store,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'
import { useAppSettings } from '@/context/AppSettingsContext'
import type { BusinessMode } from '@/db/models'

export const OnboardingModal: React.FC = () => {
  const { hasCompletedOnboarding, isLoading, completeOnboarding } = useAppSettings()
  const [selectedMode, setSelectedMode] = useState<BusinessMode>('hybrid')
  const [storeNameInput, setStoreNameInput] = useState('My SME Store')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading || hasCompletedOnboarding) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await completeOnboarding(selectedMode, storeNameInput)
    } finally {
      setIsSubmitting(false)
    }
  }

  const modes: Array<{
    id: BusinessMode
    title: string
    subtitle: string
    icon: React.ComponentType<{ className?: string }>
    badge: string
    badgeColor: string
    recommended?: boolean
    bullets: string[]
  }> = [
    {
      id: 'no_expiry',
      title: 'Products WITHOUT Expiry Date',
      subtitle: 'Best for Boutiques, Electronics, Hardware & Auto Spares',
      icon: Package,
      badge: 'Non-Perishables',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      bullets: [
        'Hides expiry inputs & date pickers across forms',
        'Streamlined FIFO costing on batches',
        'Zero clutter for durable non-perishable stock',
      ],
    },
    {
      id: 'expiry_only',
      title: 'Products WITH Expiry Date',
      subtitle: 'Best for Pharmacies, Food Markets & Perishables',
      icon: CalendarClock,
      badge: 'Strict FEFO / Expiry Tracking',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      bullets: [
        'Automated near-expiry alerts (30/60/90 days)',
        'Mandatory batch expiry entry on stock reception',
        'Expired lot quarantine indicators',
      ],
    },
    {
      id: 'hybrid',
      title: 'Hybrid Store (Both Product Types)',
      subtitle: 'Best for Supermarkets, Department Stores & Wholesalers',
      icon: Layers,
      badge: 'All-Rounder',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      recommended: true,
      bullets: [
        'Optional expiry dates per batch/product',
        'Works for drinks, snacks, cosmetics alongside goods',
        'Maximum flexibility as your enterprise scales',
      ],
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl my-8 bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-950/50 overflow-hidden">
        {/* Glow Header Accent */}
        <div className="h-2 bg-gradient-to-r from-purple-700 via-purple-500 to-indigo-500" />

        <div className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mb-1">
              <img
                src="/pika-logo.png"
                alt="Pika"
                className="w-14 h-14 object-contain drop-shadow-lg"
              />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold tracking-wide uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Welcome to Pika
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Configure Your Enterprise Workflow
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
              Select how your inventory handles product shelf life. Pika adapts its UI, alerts, and batch costing dynamically.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Store Name Input */}
            <div className="max-w-md mx-auto">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 mb-1.5">
                Business / Store Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Store className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={storeNameInput}
                  onChange={(e) => setStoreNameInput(e.target.value)}
                  placeholder="e.g. Apex Wholesalers Ltd"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Business Mode Cards */}
            <div className="space-y-3">
              <label className="block text-xs font-medium uppercase tracking-wider text-slate-300 text-center">
                Select Operational Mode
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {modes.map((mode) => {
                  const Icon = mode.icon
                  const isSelected = selectedMode === mode.id

                  return (
                    <div
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      className={`relative flex flex-col p-5 rounded-xl border text-left cursor-pointer transition-all duration-200 select-none ${
                        isSelected
                          ? 'bg-purple-900/20 border-purple-500 ring-2 ring-purple-500/40 shadow-lg shadow-purple-950/40'
                          : 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                              : 'bg-slate-700/60 text-slate-300'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        {mode.recommended && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm">
                            Recommended
                          </span>
                        )}
                        {isSelected && !mode.recommended && (
                          <CheckCircle2 className="w-5 h-5 text-purple-400" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="space-y-1.5 flex-1">
                        <h3 className="font-semibold text-white text-base">
                          {mode.title}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {mode.subtitle}
                        </p>
                      </div>

                      {/* Pill Tag */}
                      <div className="my-3">
                        <span
                          className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md border ${mode.badgeColor}`}
                        >
                          {mode.badge}
                        </span>
                      </div>

                      {/* Bullet Highlights */}
                      <ul className="space-y-1 text-[11px] text-slate-300 border-t border-slate-700/50 pt-2.5 mt-auto">
                        {mode.bullets.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-purple-400 font-bold">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bottom Notice & CTA */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>You can reconfigure this anytime in Store Settings.</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-medium text-sm transition-all shadow-lg shadow-purple-600/30 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Configuring Store...' : 'Launch Pika Store'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
