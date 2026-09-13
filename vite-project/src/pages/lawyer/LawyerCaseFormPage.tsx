import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { staffMembers } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'

export default function LawyerCaseFormPage({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const myStaff = staffMembers.filter((s) => s.lawyerId === user?.id && s.active)
  const [saved, setSaved] = useState(false)

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => navigate('/lawyer/cases'), 800)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {mode === 'edit' ? 'Edit Case' : 'Add New Case'}
        </h1>
        <p className="text-sm text-muted">মামলার সম্পূর্ণ তথ্য পূরণ করুন।</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border border-border bg-white p-5 shadow-sm sm:grid-cols-2">
        <Input label="Case Number" required placeholder="123/2026" defaultValue={mode === 'edit' ? '123/2026' : ''} />
        <Input label="Case Title" required defaultValue={mode === 'edit' ? 'করিম উদ্দিন বনাম রহিম মিয়া' : ''} />
        <Select
          label="Case Type"
          required
          options={['সিভিল স্যুট', 'ফৌজদারি', 'পারিবারিক', 'কর্পোরেট', 'জমি জমা'].map((v) => ({
            value: v,
            label: v,
          }))}
          defaultValue="সিভিল স্যুট"
        />
        <Select
          label="Case Status"
          options={['Active', 'Pending', 'Hearing Scheduled', 'Disposed', 'Closed'].map((v) => ({
            value: v,
            label: v,
          }))}
          defaultValue="Active"
        />
        <Input label="Court Name" required />
        <Input label="Court Location" required />
        <Input label="Filing Date" type="date" required />
        <Input label="Next Hearing Date" type="date" required />
        <Input label="Plaintiff / বাদী" required />
        <Input label="Defendant / বিবাদী" required />
        <Input label="Plaintiff Lawyer" />
        <Input label="Defendant Lawyer" />
        <Input label="Judge Name" />
        <Select
          label="Assigned Staff"
          placeholder="নির্বাচন করুন"
          options={myStaff.map((s) => ({ value: s.id, label: s.name }))}
        />
        <div className="sm:col-span-2">
          <Textarea label="Case Description" />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Important Notes" />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit">{mode === 'edit' ? 'Update Case' : 'Save Case'}</Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          {saved && <span className="self-center text-sm text-success">সংরক্ষণ হয়েছে (মক)...</span>}
        </div>
      </form>
    </div>
  )
}
