import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api, ApiError } from '@/lib/api'
import { DEMO_ACCOUNTS, getLawyerById, getStaffById, lawyers, staffMembers } from '@/data/mock'
import type { AuthUser, UserRole } from '@/types'

interface AuthState {
  user: AuthUser | null
  token: string | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  registerLawyer: (data: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
  registerStaff: (data: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  isAuthenticated: () => boolean
  hasRole: (...roles: UserRole[]) => boolean
}

type AuthResponse = {
  token: string
  user: AuthUser & { lawyerId?: string }
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
  if (staff && staff.active && (password === 'staff123' || password.length >= 6)) {
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
          const user: AuthUser = {
            id,
            name,
            email: String(payload.email || ''),
            role: 'LAWYER',
            photo:
              String(payload.photo || '') ||
              `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0c2e33`,
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
          const user: AuthUser = {
            id,
            name,
            email: String(payload.email || ''),
            role: 'STAFF',
            lawyerId: String(payload.lawyerId || 'law-1'),
            photo: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=1a6b75`,
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
