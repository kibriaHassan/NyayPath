import * as SecureStore from 'expo-secure-store'
import { create } from 'zustand'
import { api, ApiError, bindAuthToken } from '../api/client'
import { normalizePhotoUrl } from '../utils/avatar'

export type UserRole = 'LAWYER' | 'STAFF' | 'ADMIN'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: UserRole
  photo?: string
  lawyerId?: string
  staffCode?: string
  active?: boolean
}

type AuthState = {
  user: AuthUser | null
  token: string | null
  ready: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  registerLawyer: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
  registerStaff: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  bootstrap: () => Promise<void>
  updateUser: (patch: Partial<AuthUser>) => void
  /** Clear bad/demo session (e.g. after API 401) */
  invalidateSession: () => Promise<void>
}

const TOKEN_KEY = 'nyaypath-mobile-token'
const USER_KEY = 'nyaypath-mobile-user'

function withPhoto(user: AuthUser): AuthUser {
  return { ...user, photo: normalizePhotoUrl(user.photo, user.name) }
}

function isRealJwt(token: string | null | undefined): boolean {
  if (!token) return false
  if (token.startsWith('demo-')) return false
  return token.split('.').length === 3
}

async function saveSession(token: string | null, user: AuthUser | null) {
  if (token && user) {
    await SecureStore.setItemAsync(TOKEN_KEY, token)
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user))
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    await SecureStore.deleteItemAsync(USER_KEY)
  }
}

async function applySession(
  set: (p: Partial<AuthState>) => void,
  token: string,
  user: AuthUser,
) {
  const next = withPhoto(user)
  // Update React state first so login remounts in one tap
  set({ token, user: next })
  await saveSession(token, next)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  ready: false,

  invalidateSession: async () => {
    set({ user: null, token: null })
    await saveSession(null, null)
  },

  bootstrap: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY)
      const raw = await SecureStore.getItemAsync(USER_KEY)

      // Drop offline demo tokens — they cannot call the real API
      if (token && !isRealJwt(token)) {
        await saveSession(null, null)
        set({ user: null, token: null, ready: true })
        return
      }

      if (token && raw) {
        const user = withPhoto(JSON.parse(raw) as AuthUser)
        set({ token, user, ready: true })

        try {
          const me = await api<{ user: AuthUser }>('/auth/me', { token })
          const serverUser = withPhoto({
            ...user,
            ...me.user,
            name: me.user.name || user.name,
            photo: me.user.photo || user.photo,
          })
          set({ user: serverUser })
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(serverUser))

          if (serverUser.role === 'STAFF') {
            try {
              const staff = await api<{ data: AuthUser & { active?: boolean; lawyerId?: string } }>(
                '/staff/me',
                { token },
              )
              const next = withPhoto({
                ...serverUser,
                active: staff.data.active !== false,
                lawyerId: staff.data.lawyerId || '',
                staffCode: staff.data.staffCode || serverUser.staffCode,
                photo: staff.data.photo || serverUser.photo,
                name: staff.data.name || serverUser.name,
              })
              set({ user: next })
              await SecureStore.setItemAsync(USER_KEY, JSON.stringify(next))
            } catch {
              /* keep */
            }
          }
        } catch (e) {
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
            await saveSession(null, null)
            set({ user: null, token: null, ready: true })
          }
        }
        return
      }
    } catch {
      /* ignore */
    }
    set({ ready: true })
  },

  login: async (email, password) => {
    try {
      const data = await api<{ token: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        token: null,
        auth: false,
      })
      if (data.user.role === 'ADMIN') {
        return { ok: false, error: 'Admin is web-only. Use lawyer or staff.' }
      }
      if (!isRealJwt(data.token)) {
        return { ok: false, error: 'Invalid server token' }
      }
      await applySession(set, data.token, data.user)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof ApiError ? e.message : 'Login failed' }
    }
  },

  registerLawyer: async (payload) => {
    try {
      const data = await api<{ token: string; user: AuthUser }>('/auth/register/lawyer', {
        method: 'POST',
        body: payload,
        auth: false,
      })
      await applySession(set, data.token, data.user)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof ApiError ? e.message : 'Registration failed' }
    }
  },

  registerStaff: async (payload) => {
    try {
      const data = await api<{ token: string; user: AuthUser }>('/auth/register/staff', {
        method: 'POST',
        body: payload,
        auth: false,
      })
      await applySession(set, data.token, data.user)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof ApiError ? e.message : 'Registration failed' }
    }
  },

  logout: async () => {
    // Clear UI state first so navigator remounts immediately (one tap)
    set({ user: null, token: null })
    await saveSession(null, null)
  },

  updateUser: (patch) => {
    const current = get().user
    if (!current) return
    const next = withPhoto({ ...current, ...patch })
    set({ user: next })
    void SecureStore.setItemAsync(USER_KEY, JSON.stringify(next))
  },
}))
