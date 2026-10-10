import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cases as mockCases, staffMembers } from '@/data/mock'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { dateKeyFromValue, sortByNextHearing } from '@/lib/courtCalendar'
import { formatDate } from '@/lib/utils'
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
  const [onDate, setOnDate] = useState('')

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
      if (staff && !(c.assignedStaffIds || []).includes(staff)) return false
      if (onDate) {
        const day = dateKeyFromValue(onDate)
        const dates = [c.nextHearingDate, c.filingDate, c.lastHearingDate].map((d) =>
          dateKeyFromValue(d),
        )
        if (!dates.includes(day)) return false
      }
      return true
    })
  }, [list, q, status, court, type, staff, onDate])

  const ordered = useMemo(() => sortByNextHearing(filtered), [filtered])
  const staffName = (id: string) => myStaff.find((s) => s.id === id)?.name || ''
  const assignedCount = ordered.filter((c) => (c.assignedStaffIds || []).length > 0).length
  const selfCount = ordered.length - assignedCount

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] bg-[#0c3d4a] px-6 py-6 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-teal-300/30" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-amber-300/20" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100/80">NyayPath</p>
            <h1 className="mt-1 font-display text-3xl font-semibold">My Cases</h1>
            <p className="mt-1 text-sm text-white/75">
              {loading ? 'লোড হচ্ছে…' : 'পরবর্তী শুনানির তারিখ অনুযায়ী সাজানো'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-semibold">{ordered.length} মামলা</span>
            <span className="rounded-2xl bg-amber-300/25 px-4 py-2 text-sm font-semibold">{assignedCount} স্টাফে</span>
            <span className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold">{selfCount} নিজে</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQ('')
              setStatus('')
              setCourt('')
              setType('')
              setStaff('')
              setOnDate('')
            }}
          >
            সব মামলা দেখুন
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => {
              setQ('')
              setStatus('')
              setCourt('')
              setType('')
              setStaff('')
              setOnDate('')
              setLoading(true)
              Promise.all([
                api<{ data: Case[] }>('/cases').catch(() => ({ data: mockCases.filter(mine) })),
                api<{ data: Staff[] }>('/staff').catch(() => ({
                  data: staffMembers.filter((s) => s.lawyerId === user?.id),
                })),
              ])
                .then(([caseRes, staffRes]) => {
                  setList(caseRes.data || [])
                  setMyStaff(staffRes.data || [])
                })
                .finally(() => setLoading(false))
            }}
          >
            {loading ? 'লোড হচ্ছে…' : 'রিলোড'}
          </Button>
          <Link to="/lawyer/cases/new">
            <Button>Add New Case</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 rounded-[24px] border border-teal/15 bg-gradient-to-br from-white to-teal-50/60 p-4 shadow-sm md:grid-cols-2 xl:grid-cols-3">
        <Input label="Search" placeholder="নম্বর / শিরোনাম" value={q} onChange={(e) => setQ(e.target.value)} />
        <Input
          label="তারিখ"
          type="date"
          value={onDate}
          onChange={(e) => setOnDate(e.target.value)}
          hint="এই তারিখের শুনানি বা দাখিলের মামলা"
        />
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

      {!loading && ordered.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-border bg-white px-4 py-12 text-center text-sm text-muted">
          কোনো মামলা নেই। <Link to="/lawyer/cases/new" className="font-semibold text-teal hover:underline">Add New Case</Link> দিয়ে যোগ করুন।
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ordered.map((c) => {
            const names = (c.assignedStaffIds || []).map(staffName).filter(Boolean)
            const withStaff = names.length > 0
            return (
              <Link
                key={c.id}
                to={`/lawyer/cases/${c.id}`}
                className={
                  withStaff
                    ? 'group relative overflow-hidden rounded-[26px] rounded-br-lg border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
                    : 'group relative overflow-hidden rounded-[26px] rounded-bl-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-md'
                }
              >
                <span
                  className={
                    withStaff
                      ? 'absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500'
                      : 'absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-teal-500 to-cyan-400'
                  }
                />
                <div className="flex items-start justify-between gap-3 pl-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold text-teal">{c.caseNumber}</p>
                    <h2 className="mt-1 font-display text-lg font-semibold leading-snug text-ink">{c.caseTitle}</h2>
                  </div>
                  <Badge variant={statusBadgeVariant(c.status)}>{c.status}</Badge>
                </div>
                <p className="mt-3 pl-2 text-sm text-muted">
                  {c.courtName}
                  {c.district ? ` · ${c.district}` : ''}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pl-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink">
                    পরবর্তী {formatDate(c.nextHearingDate) || '—'}
                  </span>
                  <span
                    className={
                      withStaff
                        ? 'rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white'
                        : 'rounded-full bg-teal/10 px-3 py-1 text-xs font-bold text-teal'
                    }
                  >
                    {withStaff ? names.join(', ') : 'নিজে পরিচালনা'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
