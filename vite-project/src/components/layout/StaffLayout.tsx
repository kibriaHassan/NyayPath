import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'

/** Disabled staff — মামলা/টাস্ক লক; Profile খোলা রাখে */
export function StaffAccessGuard() {
  const user = useAuthStore((s) => s.user)
  const updateSessionUser = useAuthStore((s) => s.updateSessionUser)
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [blocked, setBlocked] = useState(user?.active === false)

  useEffect(() => {
    let alive = true
    api<{ data: { active?: boolean; lawyerId?: string; staffCode?: string } }>('/staff/me')
      .then((res) => {
        if (!alive) return
        const active = res.data.active !== false
        setBlocked(!active)
        updateSessionUser({
          active,
          lawyerId: res.data.lawyerId || '',
          staffCode: res.data.staffCode,
        })
      })
      .catch(() => {
        /* offline — session active flag ব্যবহার */
        if (alive && user?.active === false) setBlocked(true)
      })
      .finally(() => {
        if (alive) setChecking(false)
      })
    return () => {
      alive = false
    }
  }, [user?.id, user?.active, updateSessionUser, location.pathname])

  if (checking) {
    return <p className="text-sm text-muted">লোড হচ্ছে…</p>
  }

  if (blocked) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-danger/30 bg-white px-6 py-10 text-center shadow-sm">
        <ShieldOff className="h-10 w-10 text-danger" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">অ্যাকাউন্ট Disabled</h1>
        <p className="mt-2 text-sm text-muted">
          উকিল আপনার অ্যাক্সেস বন্ধ করেছেন। মামলা, শুনানি, টাস্ক বা ডকুমেন্টে ক্লিক করলে কোনো কাজ হবে না।
        </p>
        <div className="mt-6">
          <Link to="/staff/profile">
            <Button>Profile এ যান — এই উকিলে কাজ বন্ধ করুন</Button>
          </Link>
        </div>
      </div>
    )
  }

  return <Outlet />
}
