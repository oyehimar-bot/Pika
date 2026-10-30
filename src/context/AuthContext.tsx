import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { db, type Staff, type StaffRole } from '@/db'

interface AuthContextType {
  currentStaff: Staff | null
  allStaff: Staff[]
  isPinModalOpen: boolean
  setIsPinModalOpen: (open: boolean) => void
  switchStaffWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>
  switchStaffByIdAndPin: (
    staffId: number,
    pin: string
  ) => Promise<{ success: boolean; error?: string }>
  hasRole: (roles: StaffRole | StaffRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEFAULT_ADMIN: Staff = {
  id: 1,
  name: 'Admin',
  pin: '0000',
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null)
  const [allStaff, setAllStaff] = useState<Staff[]>([])
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)

  // Load all staff and active staff on mount
  useEffect(() => {
    async function loadStaff() {
      try {
        const staffList = await db.staff.filter((s) => s.isActive).toArray()
        setAllStaff(staffList)

        // Check if there was a saved active staff
        const savedStaffId = localStorage.getItem('pika-active-staff-id')
        if (savedStaffId && staffList.length > 0) {
          const found = staffList.find((s) => s.id === Number(savedStaffId))
          if (found) {
            setCurrentStaff(found)
            return
          }
        }

        // Default to first active staff or fallback to default admin
        if (staffList.length > 0) {
          setCurrentStaff(staffList[0])
          localStorage.setItem('pika-active-staff-id', String(staffList[0].id))
        } else {
          setCurrentStaff(DEFAULT_ADMIN)
        }
      } catch (err) {
        console.error('Failed to load staff accounts:', err)
        setCurrentStaff(DEFAULT_ADMIN)
      }
    }

    loadStaff()
  }, [])

  const switchStaffWithPin = async (
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const match = await db.staff
        .where('pin')
        .equals(pin)
        .and((s) => s.isActive)
        .first()

      if (!match) {
        return { success: false, error: 'Invalid 4-digit PIN.' }
      }

      setCurrentStaff(match)
      if (match.id) {
        localStorage.setItem('pika-active-staff-id', String(match.id))
      }

      // Log login event
      await db.auditLogs.add({
        staffId: String(match.id),
        staffName: match.name,
        action: 'staff_login',
        entity: 'staff',
        entityId: match.id,
        details: `Staff ${match.name} (${match.role}) authenticated`,
        timestamp: new Date(),
      })

      return { success: true }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Authentication failed',
      }
    }
  }

  const switchStaffByIdAndPin = async (
    staffId: number,
    pin: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const staffMember = await db.staff.get(staffId)
      if (!staffMember || !staffMember.isActive) {
        return { success: false, error: 'Staff account not found or inactive.' }
      }

      if (staffMember.pin !== pin) {
        return { success: false, error: 'Incorrect PIN.' }
      }

      setCurrentStaff(staffMember)
      localStorage.setItem('pika-active-staff-id', String(staffMember.id))

      await db.auditLogs.add({
        staffId: String(staffMember.id),
        staffName: staffMember.name,
        action: 'staff_login',
        entity: 'staff',
        entityId: staffMember.id,
        details: `Staff ${staffMember.name} switched session`,
        timestamp: new Date(),
      })

      return { success: true }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Switch failed',
      }
    }
  }

  const hasRole = (roles: StaffRole | StaffRole[]): boolean => {
    if (!currentStaff) return false
    if (currentStaff.role === 'admin') return true // Admin has access to all roles
    const allowed = Array.isArray(roles) ? roles : [roles]
    return allowed.includes(currentStaff.role)
  }

  return (
    <AuthContext.Provider
      value={{
        currentStaff,
        allStaff,
        isPinModalOpen,
        setIsPinModalOpen,
        switchStaffWithPin,
        switchStaffByIdAndPin,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
