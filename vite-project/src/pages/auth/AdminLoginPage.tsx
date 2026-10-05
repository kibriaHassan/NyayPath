import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Scale, Shield } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'

export default function AdminLoginPage() {
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await login(email.trim(), password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error || 'Login ব্যর্থ হয়েছে')
      return
    }
    const next = useAuthStore.getState().user
    if (next?.role !== 'ADMIN') {
      logout()
      setError('এই অ্যাকাউন্ট Admin নয়। শুধু Admin ইমেইল/পাসওয়ার্ড দিয়ে লগইন করুন।')
      return
    }
    navigate('/admin/dashboard', { replace: true })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#f3f6f8] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-sand">
            <Scale className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold text-ink">NyayPath</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-sand">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold">Admin Login</h1>
            <p className="mt-0.5 text-sm text-muted">ইমেইল ও পাসওয়ার্ড দিয়ে প্রবেশ করুন।</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="username"
            placeholder="ইমেইল"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="পাসওয়ার্ড"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" fullWidth disabled={loading}>
            {loading ? 'লগইন হচ্ছে...' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  )
}
