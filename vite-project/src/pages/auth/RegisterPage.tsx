import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'

export default function RegisterPage() {
  const registerLawyer = useAuthStore((s) => s.registerLawyer)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    barAssociation: '',
    enrollmentNumber: '',
    practiceArea: 'সিভিল',
    court: '',
    chamberName: '',
    chamberAddress: '',
    bio: '',
    yearsOfExperience: '5',
    photo: '',
  })

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('পাসওয়ার্ড মিলছে না।')
      return
    }
    if (form.password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।')
      return
    }
    const result = await registerLawyer({
      fullName: form.fullName,
      email: form.email,
      mobile: form.mobile,
      password: form.password,
      barAssociation: form.barAssociation,
      enrollmentNumber: form.enrollmentNumber,
      practiceArea: form.practiceArea === 'উভয়' ? 'সিভিল' : form.practiceArea,
      practiceType:
        form.practiceArea === 'ফৌজদারি' ? 'criminal' : form.practiceArea === 'উভয়' ? 'both' : 'civil',
      court: form.court,
      district: form.court,
      chamberName: form.chamberName,
      chamberAddress: form.chamberAddress,
      bio: form.bio,
      yearsOfExperience: Number(form.yearsOfExperience) || 0,
      photo: form.photo || undefined,
      publicProfileEnabled: true,
    })
    if (!result.ok) {
      setError(result.error || 'Registration ব্যর্থ')
      return
    }
    navigate('/lawyer/dashboard')
  }

  return (
    <div className="container-page py-6 sm:py-10">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-6 md:p-8">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Register as Lawyer</h1>
        <p className="mt-2 text-sm text-muted">
          প্রোফাইল তৈরি করে মামলা ও স্টাফ পরিচালনা শুরু করুন। Staff invitation আলাদা ফ্লোতে হবে।
        </p>

        <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
          <Input label="Full Name" required value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Input label="Mobile Number" required value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
          <Input label="Years of Experience" type="number" value={form.yearsOfExperience} onChange={(e) => set('yearsOfExperience', e.target.value)} />
          <Input label="Password" type="password" required value={form.password} onChange={(e) => set('password', e.target.value)} />
          <Input label="Confirm Password" type="password" required value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} />
          <Input label="Bar Council / Bar Association" required value={form.barAssociation} onChange={(e) => set('barAssociation', e.target.value)} />
          <Input label="Enrollment Number" required value={form.enrollmentNumber} onChange={(e) => set('enrollmentNumber', e.target.value)} />
          <Select
            label="মামলার ধরন"
            value={form.practiceArea}
            onChange={(e) => set('practiceArea', e.target.value)}
            options={[
              { value: 'সিভিল', label: 'শুধু সিভিল' },
              { value: 'ফৌজদারি', label: 'শুধু ফৌজদারি' },
              { value: 'উভয়', label: 'উভয়' },
            ]}
          />          <Input label="Court / District" required value={form.court} onChange={(e) => set('court', e.target.value)} />
          <Input label="Chamber Name" value={form.chamberName} onChange={(e) => set('chamberName', e.target.value)} />
          <Input label="Profile Photo URL (ঐচ্ছিক)" placeholder="https://..." value={form.photo} onChange={(e) => set('photo', e.target.value)} />
          <div className="sm:col-span-2">
            <Input label="Chamber Address" value={form.chamberAddress} onChange={(e) => set('chamberAddress', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Professional Bio" value={form.bio} onChange={(e) => set('bio', e.target.value)} />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" fullWidth size="lg">
              Register & Go to Dashboard
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          স্টাফ?{' '}
          <Link to="/register/staff" className="font-semibold text-teal hover:underline">
            Register as Staff
          </Link>
          {' · '}
          ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
          <Link to="/login" className="font-semibold text-teal hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
