import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'

export type StaffPerms = Record<string, boolean>

export function useStaffPerms() {
  const user = useAuthStore((s) => s.user)
  const [perms, setPerms] = useState<StaffPerms | null>(user?.role === 'STAFF' ? null : {})

  useEffect(() => {
    if (user?.role !== 'STAFF') {
      setPerms({})
      return
    }
    let cancelled = false
    api<{ data: { permissions?: StaffPerms } }>('/staff/me')
      .then((res) => {
        if (!cancelled) setPerms(res.data.permissions || {})
      })
      .catch(() => {
        if (!cancelled) setPerms({})
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.role])

  const allow = (key: string) => user?.role !== 'STAFF' || Boolean(perms?.[key])
  return { perms, ready: perms !== null, allow, isStaff: user?.role === 'STAFF' }
}
