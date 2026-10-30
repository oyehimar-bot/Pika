import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { db } from '../db/database'
import type { BusinessMode } from '../db/models'

interface AppSettingsContextType {
  businessMode: BusinessMode
  hasCompletedOnboarding: boolean
  storeName: string
  isLoading: boolean
  showExpiry: boolean
  isHybrid: boolean
  isNoExpiry: boolean
  setBusinessMode: (mode: BusinessMode) => Promise<void>
  setStoreName: (name: string) => Promise<void>
  completeOnboarding: (mode: BusinessMode, storeName?: string) => Promise<void>
  resetOnboarding: () => Promise<void>
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined)

const DEFAULT_STORE_NAME = 'Pika SME Enterprise'
const DEFAULT_BUSINESS_MODE: BusinessMode = 'hybrid'

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businessMode, setBusinessModeState] = useState<BusinessMode>(DEFAULT_BUSINESS_MODE)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(true) // default true to avoid flash before load
  const [storeName, setStoreNameState] = useState<string>(DEFAULT_STORE_NAME)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    async function loadSettings() {
      try {
        const [modeSetting, onboardingSetting, storeNameSetting] = await Promise.all([
          db.appSettings.get('business_mode'),
          db.appSettings.get('onboarding_completed'),
          db.appSettings.get('store_name'),
        ])

        if (modeSetting && typeof modeSetting.value === 'string') {
          setBusinessModeState(modeSetting.value as BusinessMode)
        }

        if (storeNameSetting && typeof storeNameSetting.value === 'string') {
          setStoreNameState(storeNameSetting.value)
        }

        if (onboardingSetting !== undefined) {
          setHasCompletedOnboarding(Boolean(onboardingSetting.value))
        } else {
          // If no setting exists yet, onboarding is not completed
          setHasCompletedOnboarding(false)
        }
      } catch (err) {
        console.error('Failed to load app settings from IndexedDB:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  const setBusinessMode = async (mode: BusinessMode) => {
    setBusinessModeState(mode)
    await db.appSettings.put({ key: 'business_mode', value: mode })
    // Also record audit log for settings change
    await db.auditLogs.add({
      staffId: 'system',
      staffName: 'Admin',
      action: 'settings_changed',
      entity: 'system',
      details: `Business mode changed to: ${
        mode === 'no_expiry'
          ? 'Products WITHOUT Expiry Date'
          : mode === 'expiry_only'
          ? 'Products WITH Expiry Date'
          : 'Hybrid (Both Product Types)'
      }`,
      timestamp: new Date(),
    })
  }

  const setStoreName = async (name: string) => {
    setStoreNameState(name)
    await db.appSettings.put({ key: 'store_name', value: name })
  }

  const completeOnboarding = async (mode: BusinessMode, customStoreName?: string) => {
    const finalStoreName = customStoreName?.trim() || storeName || DEFAULT_STORE_NAME
    setBusinessModeState(mode)
    setStoreNameState(finalStoreName)
    setHasCompletedOnboarding(true)

    await Promise.all([
      db.appSettings.put({ key: 'business_mode', value: mode }),
      db.appSettings.put({ key: 'store_name', value: finalStoreName }),
      db.appSettings.put({ key: 'onboarding_completed', value: true }),
    ])

    await db.auditLogs.add({
      staffId: 'system',
      staffName: 'Admin',
      action: 'settings_changed',
      entity: 'system',
      details: `Initial setup completed: Store Name "${finalStoreName}", Mode "${mode}"`,
      timestamp: new Date(),
    })
  }

  const resetOnboarding = async () => {
    setHasCompletedOnboarding(false)
    await db.appSettings.put({ key: 'onboarding_completed', value: false })
  }

  const showExpiry = useMemo(() => {
    return businessMode === 'expiry_only' || businessMode === 'hybrid'
  }, [businessMode])

  const isHybrid = useMemo(() => {
    return businessMode === 'hybrid'
  }, [businessMode])

  const isNoExpiry = useMemo(() => {
    return businessMode === 'no_expiry'
  }, [businessMode])

  return (
    <AppSettingsContext.Provider
      value={{
        businessMode,
        hasCompletedOnboarding,
        storeName,
        isLoading,
        showExpiry,
        isHybrid,
        isNoExpiry,
        setBusinessMode,
        setStoreName,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  )
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext)
  if (!context) {
    throw new Error('useAppSettings must be used within an AppSettingsProvider')
  }
  return context
}
