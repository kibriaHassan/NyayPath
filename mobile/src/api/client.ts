import { Platform } from 'react-native'
import Constants from 'expo-constants'

/**
 * Resolves backend URL for emulator, simulator, and physical Expo Go devices.
 * Physical phones cannot use 10.0.2.2 — that is Android-emulator-only.
 */
function hostFromExpo(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.linkingUri ||
    (Constants as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } }).manifest2
      ?.extra?.expoClient?.hostUri ||
    (Constants as { manifest?: { debuggerHost?: string; hostUri?: string } }).manifest
      ?.debuggerHost ||
    (Constants as { manifest?: { hostUri?: string } }).manifest?.hostUri

  if (!hostUri || typeof hostUri !== 'string') return null
  // examples: "192.168.0.105:8081", "exp://192.168.0.105:8081", "http://192.168.0.105:8081"
  const cleaned = hostUri.replace(/^[a-z]+:\/\//i, '').split('/')[0]
  const host = cleaned.split(':')[0]
  if (!host || host === 'localhost' || host === '127.0.0.1') return null
  return host
}

function resolveApiBase(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
  const expoHost = hostFromExpo()

  // Prefer LAN host from Metro when env points at emulator-only loopback
  if (expoHost) {
    if (
      !envUrl ||
      envUrl.includes('10.0.2.2') ||
      envUrl.includes('localhost') ||
      envUrl.includes('127.0.0.1')
    ) {
      return `http://${expoHost}:4000/api`
    }
  }

  if (envUrl) return envUrl.replace(/\/$/, '')

  if (Platform.OS === 'android') return 'http://10.0.2.2:4000/api'
  return 'http://localhost:4000/api'
}

export const API_BASE = resolveApiBase()

type ApiOptions = {
  method?: string
  body?: unknown
  token?: string | null
  auth?: boolean
}

export class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

let tokenGetter: () => string | null = () => null
let onUnauthorized: (() => void) | null = null

export function bindAuthToken(getter: () => string | null) {
  tokenGetter = getter
}

export function bindUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  const useAuth = options.auth !== false
  const token = options.token === undefined ? (useAuth ? tokenGetter() : null) : options.token
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: options.method || (options.body ? 'POST' : 'GET'),
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(
      `সার্ভারে সংযোগ হচ্ছে না (${API_BASE}). ব্যাকএন্ড চালু আছে কি?`,
      0,
      'NETWORK',
    )
  }

  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
  if (!res.ok) {
    const err = new ApiError(data.error || 'Request failed', res.status, data.code)
    if (res.status === 401 && useAuth && token) {
      onUnauthorized?.()
    }
    throw err
  }
  return data as T
}
