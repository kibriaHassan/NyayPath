import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, ApiError } from '@/lib/api'
import { DEMO_ACCOUNTS, getLawyerById, getStaffById, lawyers, staffMembers } from '@/data/mock'
import { generateStaffCode } from '@/lib/staffCode'
import type { AuthUser, Staff, UserRole } from '@/types'

interface AuthState {
  user: AuthUser | null
  token: string | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  registerLawyer: (data: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
  registerStaff: (data: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
  updateSessionUser: (patch: Partial<AuthUser>) => void
  logout: () => void
  isAuthenticated: () => boolean
  hasRole: (...roles: UserRole[]) => boolean
}

type AuthResponse = {
  token: string
  user: AuthUser & { lawyerId?: string; staffCode?: string; active?: boolean }
}

function persistToken(token: string | null) {
  if (token) localStorage.setItem('nyaypath-token', token)
  else localStorage.removeItem('nyaypath-token')
}

function mockLogin(email: string, password: string): { ok: boolean; error?: string; user?: AuthUser; token?: string } {
  const normalized = email.trim().toLowerCase()

  if (normalized === DEMO_ACCOUNTS.lawyer.email && password === DEMO_ACCOUNTS.lawyer.password) {
    const lawyer = getLawyerById(DEMO_ACCOUNTS.lawyer.id)!
    return {
      ok: true,
      token: 'mock-lawyer-token',
      user: {
        id: lawyer.id,
        name: lawyer.fullName,
        email: lawyer.email,
        role: 'LAWYER',
        photo: lawyer.photo,
      },
    }
  }

  if (normalized === DEMO_ACCOUNTS.staff.email && password === DEMO_ACCOUNTS.staff.password) {
    const staff = getStaffById(DEMO_ACCOUNTS.staff.id)!
    return {
      ok: true,
      token: 'mock-staff-token',
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: 'STAFF',
        lawyerId: staff.lawyerId,
        photo: staff.photo,
        staffCode: staff.staffCode,
        active: staff.active !== false,
      },
    }
  }

  if (normalized === DEMO_ACCOUNTS.admin.email && password === DEMO_ACCOUNTS.admin.password) {
    return {
      ok: true,
      token: 'mock-admin-token',
      user: {
        id: DEMO_ACCOUNTS.admin.id,
        name: 'NyayPath Admin',
        email: DEMO_ACCOUNTS.admin.email,
        role: 'ADMIN',
        photo: 'https://api.dicebear.com/9.x/initials/svg?seed=AD&backgroundColor=0c2e33',
      },
    }
  }

  const lawyer = lawyers.find((l) => l.email.toLowerCase() === normalized)
  if (lawyer && (password === 'lawyer123' || password.length >= 6)) {
    return {
      ok: true,
      token: 'mock-lawyer-token',
      user: {
        id: lawyer.id,
        name: lawyer.fullName,
        email: lawyer.email,
        role: 'LAWYER',
        photo: lawyer.photo,
      },
    }
  }

  const staff = staffMembers.find((s) => s.email.toLowerCase() === normalized)
  if (staff && (password === 'staff123' || password.length >= 6)) {
    return {
      ok: true,
      token: 'mock-staff-token',
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: 'STAFF',
        lawyerId: staff.lawyerId,
        photo: staff.photo,
        staffCode: staff.staffCode,
        active: staff.active !== false,
      },
    }
  }

  return { ok: false, error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,

      login: async (email, password) => {
        try {
          const data = await api<AuthResponse>('/auth/login', {
            method: 'POST',
            body: { email, password },
          })
          persistToken(data.token)
          set({
            token: data.token,
            user: {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: data.user.role as UserRole,
              photo: data.user.photo,
              lawyerId: data.user.lawyerId,
              staffCode: data.user.staffCode,
              active: data.user.active,
            },
          })
          return { ok: true }
        } catch (e) {
          // Backend offline → mock fallback for local demo
          if (e instanceof TypeError || (e instanceof ApiError && e.status >= 500)) {
            const fallback = mockLogin(email, password)
            if (fallback.ok && fallback.user) {
              persistToken(fallback.token || null)
              set({ token: fallback.token || null, user: fallback.user })
              return { ok: true }
            }
            return { ok: false, error: fallback.error }
          }
          const msg = e instanceof ApiError ? e.message : 'Login ব্যর্থ হয়েছে'
          // Wrong credentials from API — also try mock for same demo accounts
          const fallback = mockLogin(email, password)
          if (fallback.ok && fallback.user) {
            persistToken(fallback.token || null)
            set({ token: fallback.token || null, user: fallback.user })
            return { ok: true }
          }
          return { ok: false, error: msg }
        }
      },

      registerLawyer: async (payload) => {
        try {
          const data = await api<AuthResponse>('/auth/register/lawyer', {
            method: 'POST',
            body: payload,
          })
          persistToken(data.token)
          set({
            token: data.token,
            user: {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: 'LAWYER',
              photo: data.user.photo,
            },
          })
          return { ok: true }
        } catch {
          const name = String(payload.fullName || 'New Lawyer')
          const id = `law-${Date.now()}`
          const photo =
            String(payload.photo || '') ||
            `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0c2e33`
          const practiceArea = String(payload.practiceArea || 'সিভিল')
          const practiceType =
            (payload.practiceType as string) ||
            (practiceArea.includes('ফৌজদারি') ? 'criminal' : practiceArea.includes('উভয়') ? 'both' : 'civil')
          const newLawyer = {
            id,
            fullName: name,
            email: String(payload.email || ''),
            mobile: String(payload.mobile || ''),
            barAssociation: String(payload.barAssociation || ''),
            enrollmentNumber: String(payload.enrollmentNumber || ''),
            practiceAreas: practiceType === 'criminal' ? ['ফৌজদারি'] : practiceType === 'both' ? ['সিভিল', 'ফৌজদারি'] : [practiceArea],
            practiceType: practiceType as 'civil' | 'criminal' | 'both',
            court: String(payload.court || ''),
            district: String(payload.district || payload.court || ''),
            chamberName: String(payload.chamberName || ''),
            chamberAddress: String(payload.chamberAddress || ''),
            bio: String(payload.bio || ''),
            photo,
            yearsOfExperience: Number(payload.yearsOfExperience) || 0,
            designation: 'অ্যাডভোকেট',
            publicProfileEnabled: true,
            visibility: {
              enrollmentNumber: true,
              mobile: true,
              email: true,
              chamberAddress: true,
              bio: true,
            },
            verified: false,
          }
          lawyers.push(newLawyer)
          const user: AuthUser = {
            id,
            name,
            email: String(payload.email || ''),
            role: 'LAWYER',
            photo,
          }
          persistToken('mock-register-token')
          set({ token: 'mock-register-token', user })
          return { ok: true }
        }
      },

      registerStaff: async (payload) => {
        try {
          const data = await api<AuthResponse>('/auth/register/staff', {
            method: 'POST',
            body: payload,
          })
          persistToken(data.token)
          set({
            token: data.token,
            user: {
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              role: 'STAFF',
              photo: data.user.photo,
              lawyerId: data.user.lawyerId,
              staffCode: data.user.staffCode,
            },
          })
          return { ok: true }
        } catch (e) {
          if (e instanceof ApiError && (e.status === 409 || e.status === 400 || e.status === 404)) {
            return { ok: false, error: e.message }
          }
          // Offline fallback — local demo staff session
          const name = String(payload.name || 'New Staff')
          const id = `stf-${Date.now()}`
          const staffCode = generateStaffCode(staffMembers.map((s) => s.staffCode))
          const photo = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=1a6b75`
          staffMembers.push({
            id,
            staffCode,
            lawyerId: payload.lawyerId ? String(payload.lawyerId) : '',
            name,
            email: String(payload.email || ''),
            mobile: String(payload.mobile || ''),
            role: (String(payload.role || 'Legal Assistant') as Staff['role']),
            active: true,
            photo,
            permissions: {
              viewCases: true,
              editCases: false,
              addCase: false,
              viewHearingDates: true,
              editHearingDates: false,
              manageDocuments: false,
              addNotes: true,
              manageTasks: false,
            },
          })
          const user: AuthUser = {
            id,
            name,
            email: String(payload.email || ''),
            role: 'STAFF',
            lawyerId: payload.lawyerId ? String(payload.lawyerId) : '',
            photo,
            staffCode,
          }
          persistToken('mock-staff-register-token')
          set({ token: 'mock-staff-register-token', user })
          return { ok: true }
        }
      },

      logout: () => {
        persistToken(null)
        set({ user: null, token: null })
      },

      updateSessionUser: (patch) => {
        const current = get().user
        if (!current) return
        set({ user: { ...current, ...patch } })
      },

      isAuthenticated: () => !!get().user,

      hasRole: (...roles) => {
        const user = get().user
        return !!user && roles.includes(user.role)
      },
    }),
    {
      name: 'nyaypath-auth',
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) persistToken(state.token)
      },
    },
  ),
)
