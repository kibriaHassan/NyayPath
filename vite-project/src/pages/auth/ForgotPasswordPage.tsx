import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-3xl font-semibold">Forgot Password</h1>
        <p className="mt-2 text-sm text-muted">
          ইমেইল বা মোবাইল দিন — পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হবে (মক UI)।
        </p>
        {sent ? (
          <div className="mt-6 rounded-lg bg-success/10 p-4 text-sm text-success">
            রিসেট লিঙ্ক পাঠানো হয়েছে (ডেমো)।{' '}
            <Link to="/login" className="font-semibold underline">
              Login এ ফিরে যান
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Input label="Email / Mobile" required placeholder="your@email.com" />
            <Button type="submit" fullWidth>
              Send Reset Link
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
