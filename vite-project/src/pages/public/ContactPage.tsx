import { useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

export default function ContactPage() {
  const [sent, setSent] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="container-page py-12">
      <h1 className="font-display text-3xl font-semibold">Contact</h1>
      <p className="mt-2 text-muted">সহায়তা, পার্টনারশিপ বা ভেরিফিকেশন সংক্রান্ত যোগাযোগ।</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-white p-6 shadow-sm">
          <Input label="নাম" required />
          <Input label="ইমেইল" type="email" required />
          <Input label="বিষয়" required />
          <Textarea label="বার্তা" required />
          {sent ? (
            <p className="text-sm text-success">বার্তা পাঠানো হয়েছে (ডেমো)।</p>
          ) : (
            <Button type="submit">পাঠান</Button>
          )}
        </form>
        <div className="rounded-xl border border-border bg-white p-6 shadow-sm text-sm text-muted">
          <p><strong className="text-ink">ইমেইল:</strong> support@nyaypath.bd</p>
          <p className="mt-2"><strong className="text-ink">ঠিকানা:</strong> ঢাকা, বাংলাদেশ</p>
          <p className="mt-4 leading-relaxed">
            কর্মঘণ্টা: রবি–বৃহস্পতি, সকাল ১০টা – সন্ধ্যা ৬টা
          </p>
        </div>
      </div>
    </div>
  )
}
