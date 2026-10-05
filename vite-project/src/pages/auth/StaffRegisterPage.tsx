import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'

export default function StaffRegisterPage() {
  const registerStaff = useAuthStore((s) => s.registerStaff)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    role: 'Legal Assistant',
  })

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না।')
      return
    }
    if (form.password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')
      return
    }
    setLoading(true)
    const result = await registerStaff({
      name: form.name,
      email: form.email,
      mobile: form.mobile,
      password: form.password,
      role: form.role,
    })
    setLoading(false)
    if (!result.ok) {
      setError(result.error || 'Registration ব্যর্থ')
      return
    }
    navigate('/staff/profile')
  }

  return (
    <div className="container-page py-6 sm:py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6 md:p-8">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Register as Staff</h1>
        <p className="mt-2 text-sm text-muted">
          স্টাফ অ্যাকাউন্ট খুললে একটি ইউনিক ID পাবেন। সেই ID / ইমেইল / মোবাইল দিয়ে উকিল আপনাকে টিমে যোগ করতে পারবেন।
        </p>

        <div className="mt-4 rounded-xl bg-slate-panel p-4 text-sm text-muted">
          <p className="font-semibold text-ink">রেজিস্ট্রেশনের পর</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>একটি ইউনিক Staff ID পাবেন (নামের পাশে দেখাবে)</li>
            <li>ID, ইমেইল বা নাম্বার উকিলকে দিলে তিনি আপনাকে অ্যাড করতে পারবেন</li>
            <li>উকিল পারমিশন সেট করবেন — পরেও এডিট করতে পারবেন</li>
          </ul>
        </div>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input label="Full Name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Input label="Mobile" required value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            options={[
              { value: 'Case Manager', label: 'Case Manager' },
              { value: 'Legal Assistant', label: 'Legal Assistant' },
              { value: 'Office Assistant', label: 'Office Assistant' },
            ]}
          />
          <Input
            label="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
          />
          <Input
            label="Confirm Password"
            type="password"
            required
            value={form.confirmPassword}
            onChange={(e) => set('confirmPassword', e.target.value)}
          />
          {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? 'তৈরি হচ্ছে...' : 'Staff Account তৈরি করুন'}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
          <Link to="/login?role=staff" className="font-semibold text-teal hover:underline">
            Staff Login
          </Link>
          {' · '}
          <Link to="/register" className="font-semibold text-teal hover:underline">
            Lawyer Register
          </Link>
        </p>
      </div>
    </div>
  )
}
