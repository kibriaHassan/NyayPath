import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { DEMO_ACCOUNTS } from '@/data/mock'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const from = (location.state as { from?: string } | null)?.from

  const initialRole = params.get('role') === 'staff' ? 'staff' : 'lawyer'
  const [roleTab, setRoleTab] = useState<'lawyer' | 'staff'>(initialRole)
  const [email, setEmail] = useState(
    initialRole === 'staff' ? DEMO_ACCOUNTS.staff.email : DEMO_ACCOUNTS.lawyer.email,
  )
  const [password, setPassword] = useState(
    initialRole === 'staff' ? DEMO_ACCOUNTS.staff.password : DEMO_ACCOUNTS.lawyer.password,
  )
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const switchTab = (tab: 'lawyer' | 'staff') => {
    setRoleTab(tab)
    setError('')
    if (tab === 'staff') {
      setEmail(DEMO_ACCOUNTS.staff.email)
      setPassword(DEMO_ACCOUNTS.staff.password)
    } else {
      setEmail(DEMO_ACCOUNTS.lawyer.email)
      setPassword(DEMO_ACCOUNTS.lawyer.password)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await login(email, password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error || 'Login ব্যর্থ হয়েছে')
      return
    }
    const user = useAuthStore.getState().user
    if (from) navigate(from)
    else if (user?.role === 'LAWYER') navigate('/lawyer/dashboard')
    else if (user?.role === 'STAFF') navigate('/staff/dashboard')
    else navigate('/')
  }

  return (
    <div className="container-page flex justify-center py-8 sm:py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8">
        <h1 className="font-display text-3xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-muted">উকিল বা স্টাফ অ্যাকাউন্ট দিয়ে প্রবেশ করুন।</p>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-panel p-1">
          <button
            type="button"
            onClick={() => switchTab('lawyer')}
            className={cn(
              'rounded-lg py-2.5 text-sm font-semibold transition',
              roleTab === 'lawyer' ? 'bg-white text-ink shadow-sm' : 'text-muted',
            )}
          >
            Lawyer
          </button>
          <button
            type="button"
            onClick={() => switchTab('staff')}
            className={cn(
              'rounded-lg py-2.5 text-sm font-semibold transition',
              roleTab === 'staff' ? 'bg-white text-ink shadow-sm' : 'text-muted',
            )}
          >
            Staff
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <Input
            label="Email / Mobile"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-border"
              />
              Remember Me
            </label>
            <Link to="/forgot-password" className="font-medium text-teal hover:underline">
              Forgot Password
            </Link>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'লগইন হচ্ছে...' : roleTab === 'staff' ? 'Staff Login' : 'Lawyer Login'}
          </Button>
        </form>

        <div className="mt-6 rounded-lg bg-slate-panel p-3 text-xs text-muted">
          <p className="font-semibold text-ink">Demo — এক ক্লিকে ব্যবহার করুন</p>
          {roleTab === 'lawyer' ? (
            <p className="mt-1">
              {DEMO_ACCOUNTS.lawyer.email} / {DEMO_ACCOUNTS.lawyer.password}
            </p>
          ) : (
            <p className="mt-1">
              {DEMO_ACCOUNTS.staff.email} / {DEMO_ACCOUNTS.staff.password}
            </p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed">
            Staff লগইন করলে দেখবেন: Assigned Cases, Upcoming Hearings, Tasks, Documents, Notifications।
          </p>
        </div>

        <div className="mt-6 space-y-2 text-center text-sm text-muted">
          <p>
            নতুন Staff?{' '}
            <Link to="/register/staff" className="font-semibold text-teal hover:underline">
              Staff Account খুলুন
            </Link>
          </p>
          <p>
            নতুন Lawyer?{' '}
            <Link to="/register" className="font-semibold text-teal hover:underline">
              Register as Lawyer
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
