import { useState, useEffect } from 'react'
import { X, Lock, Delete, AlertCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { Staff } from '@/db'

export function PinAuthModal() {
  const {
    isPinModalOpen,
    setIsPinModalOpen,
    allStaff,
    currentStaff,
    switchStaffWithPin,
    switchStaffByIdAndPin,
  } = useAuth()

  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isPinModalOpen) {
      setSelectedStaff(currentStaff)
      setPin('')
      setError(null)
    }
  }, [isPinModalOpen, currentStaff])

  // Physical keyboard listener for digits 0-9 and backspace
  useEffect(() => {
    if (!isPinModalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          handleDigitPress(e.key)
        }
      } else if (e.key === 'Backspace') {
        handleBackspace()
      } else if (e.key === 'Escape') {
        setIsPinModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPinModalOpen, pin])

  if (!isPinModalOpen) return null

  const handleDigitPress = async (digit: string) => {
    if (pin.length >= 4 || isSubmitting) return
    const newPin = pin + digit
    setPin(newPin)
    setError(null)

    // Auto-submit on 4th digit
    if (newPin.length === 4) {
      await authenticatePin(newPin)
    }
  }

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1))
    setError(null)
  }

  const handleClear = () => {
    setPin('')
    setError(null)
  }

  const authenticatePin = async (fullPin: string) => {
    setIsSubmitting(true)
    setError(null)

    try {
      let res
      if (selectedStaff?.id) {
        res = await switchStaffByIdAndPin(selectedStaff.id, fullPin)
      } else {
        res = await switchStaffWithPin(fullPin)
      }

      if (res.success) {
        setIsPinModalOpen(false)
      } else {
        setError(res.error || 'Invalid PIN code.')
        setPin('')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setPin('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-2xl shadow-pika-950/40 p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsPinModalOpen(false)}
          className="absolute right-4 top-4 p-2 rounded-xl text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Icon & Title */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-pika-100 dark:bg-pika-950/60 text-pika-600 dark:text-pika-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">
            Staff Authentication
          </h2>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
            Enter 4-digit PIN for instant session switching
          </p>
        </div>

        {/* Staff Profiles Quick Selector */}
        {allStaff.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-4">
            {allStaff.map((staff) => {
              const isSelected = selectedStaff?.id === staff.id
              return (
                <button
                  key={staff.id}
                  onClick={() => {
                    setSelectedStaff(staff)
                    setPin('')
                    setError(null)
                  }}
                  className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-pika-500 bg-pika-50/50 dark:bg-pika-950/30 text-pika-600 dark:text-pika-300'
                      : 'border-transparent text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-1 ${
                      isSelected
                        ? 'bg-gradient-to-br from-pika-500 to-pika-700 text-white shadow-sm'
                        : 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-200'
                    }`}
                  >
                    {staff.name.substring(0, 1)}
                  </div>
                  <span className="text-[11px] font-semibold truncate max-w-[70px]">
                    {staff.name}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-surface-400">
                    {staff.role}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-1.5 p-2.5 mb-3 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl justify-center">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Indicators (4 Dots) */}
        <div className="flex items-center justify-center gap-3 my-4">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-gradient-to-br from-pika-500 to-pika-700 scale-110 shadow-md shadow-pika-500/30'
                    : 'bg-surface-200 dark:bg-surface-700 scale-90'
                }`}
              />
            )
          })}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleDigitPress(digit)}
              className="h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 active:scale-95 text-surface-900 dark:text-white font-bold text-lg transition-all shadow-sm flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-surface-50 dark:bg-surface-800/40 hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 text-xs font-semibold transition-all flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleDigitPress('0')}
            className="h-12 rounded-2xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 active:scale-95 text-surface-900 dark:text-white font-bold text-lg transition-all shadow-sm flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-surface-50 dark:bg-surface-800/40 hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 transition-all flex items-center justify-center"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Demo PIN hints */}
        <div className="mt-5 pt-3 border-t border-surface-200 dark:border-surface-800 text-[11px] text-surface-400 text-center">
          <span>Demo PINs: </span>
          <span className="font-mono text-surface-600 dark:text-surface-300">
            Admin: 0000 • Manager: 5678 • Cashier: 1234
          </span>
        </div>
      </div>
    </div>
  )
}
