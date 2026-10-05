import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cases as mockCases, staffMembers } from '@/data/mock'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { CaseTable } from '@/components/cases/CaseTable'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { Case, Staff } from '@/types'

export default function LawyerCasesPage() {
  const user = useAuthStore((s) => s.user)
  const mine = (c: Case) =>
    c.ownerLawyerId === user?.id ||
    c.plaintiffLawyerId === user?.id ||
    c.defendantLawyerId === user?.id

  const [list, setList] = useState<Case[]>(() => mockCases.filter(mine))
  const [myStaff, setMyStaff] = useState<Staff[]>(() => staffMembers.filter((s) => s.lawyerId === user?.id))
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [court, setCourt] = useState('')
  const [type, setType] = useState('')
  const [staff, setStaff] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api<{ data: Case[] }>('/cases').catch(() => ({
        data: mockCases.filter(
          (c) =>
            c.ownerLawyerId === user?.id ||
            c.plaintiffLawyerId === user?.id ||
            c.defendantLawyerId === user?.id,
        ),
      })),
      api<{ data: Staff[] }>('/staff').catch(() => ({
        data: staffMembers.filter((s) => s.lawyerId === user?.id),
      })),
    ])
      .then(([caseRes, staffRes]) => {
        if (cancelled) return
        setList(caseRes.data || [])
        setMyStaff(staffRes.data || [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const filtered = useMemo(() => {
    return list.filter((c) => {
      if (q && !(`${c.caseNumber} ${c.caseTitle}`.toLowerCase().includes(q.toLowerCase()))) return false
      if (status && c.status !== status) return false
      if (court && !c.courtName.toLowerCase().includes(court.toLowerCase())) return false
      if (type && c.caseType !== type) return false
      if (staff && !c.assignedStaffIds.includes(staff)) return false
      return true
    })
  }, [list, q, status, court, type, staff])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">My Cases</h1>
          <p className="text-sm text-muted">
            {loading ? 'লোড হচ্ছে…' : `${filtered.length} টি মামলা`}
            {myStaff.length === 0 ? ' · Staff নেই — নিজে পরিচালনা করছেন' : ''}
          </p>
        </div>
        <Link to="/lawyer/cases/new">
          <Button>Add New Case</Button>
        </Link>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <Input label="Search" placeholder="নম্বর / শিরোনাম" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="সব"
          options={['Active', 'Pending', 'Hearing Scheduled', 'Disposed', 'Closed'].map((v) => ({
            value: v,
            label: v,
          }))}
        />
        <Input label="Court" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="আদালত" />
        <Select
          label="Case Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="সব"
          options={[...new Set(list.map((c) => c.caseType).filter(Boolean))].map((v) => ({ value: v, label: v }))}
        />
        <Select
          label="Assigned Staff"
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          placeholder={myStaff.length ? 'সব' : 'স্টাফ নেই'}
          options={myStaff.map((s) => ({ value: s.id, label: `${s.name} (${s.staffCode || s.id})` }))}
        />
      </div>

      {!loading && filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white px-4 py-12 text-center text-sm text-muted">
          কোনো মামলা নেই। <Link to="/lawyer/cases/new" className="font-semibold text-teal hover:underline">Add New Case</Link> দিয়ে যোগ করুন।
        </div>
      ) : (
        <CaseTable cases={filtered} />
      )}
    </div>
  )
}
