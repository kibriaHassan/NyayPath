import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Gavel,
  MapPin,
  Sunrise,
} from 'lucide-react'
import type { Case } from '@/types'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  activeCourtDays,
  formatCourtDateHeading,
  HEARING_PURPOSE_OPTIONS,
  isCourtHoliday,
  isSameDateKey,
  needsNextHearingUpdate,
  sortByNextHearing,
} from '@/lib/courtCalendar'
import { cases as mockCases, getStaffById } from '@/data/mock'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

type Props = {
  cases: Case[]
  basePath?: string
  canUpdate?: boolean
  onCasesChange?: (cases: Case[]) => void
  /** full = today + next + overdue; urgent = today + next only */
  mode?: 'full' | 'urgent'
}

function CaseHearingCard({
  item,
  basePath,
  tone,
}: {
  item: Case
  basePath: string
  tone: 'today' | 'next'
}) {
  const staffNames = item.assignedStaffIds
    .map((id) => getStaffById(id)?.name)
    .filter(Boolean)
    .join(', ')

  return (
    <Link
      to={`${basePath}/${item.id}`}
      className={cn(
        'block rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md',
        tone === 'today' ? 'border-warning/40 ring-1 ring-warning/15' : 'border-teal/30 ring-1 ring-teal/10',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">{item.caseNumber}</p>
          <h3 className="mt-1 font-display text-lg font-semibold text-ink">{item.caseTitle}</h3>
        </div>
        <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-teal" />
          {item.courtName}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Gavel className="h-3.5 w-3.5 text-teal" />
          {item.caseType}
        </span>
      </div>
      {item.nextHearingPurpose && (
        <p className="mt-3 rounded-lg bg-slate-panel px-3 py-2 text-sm text-ink">
          <span className="text-muted">
            {tone === 'today' ? 'আজকের কাজ: ' : 'নির্ধারিত কাজ: '}
          </span>
          <strong>{item.nextHearingPurpose}</strong>
        </p>
      )}
      {staffNames && (
        <p className="mt-2 text-xs text-muted">দায়িত্বপ্রাপ্ত স্টাফ: {staffNames}</p>
      )}
    </Link>
  )
}

function OverdueUpdateCard({
  item,
  canUpdate,
  onSubmit,
}: {
  item: Case
  canUpdate: boolean
  onSubmit: (payload: {
    caseId: string
    nextHearingDate: string
    nextHearingPurpose: string
    notes?: string
  }) => Promise<void> | void
}) {
  const [date, setDate] = useState('')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const missed = formatCourtDateHeading(item.nextHearingDate)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!date || !purpose) {
      setError('পরবর্তী তারিখ এবং সেদিন কী হবে — দুটোই আবশ্যক।')
      return
    }
    if (isCourtHoliday(new Date(date + 'T00:00:00'))) {
      setError('শুক্রবার/শনিবার আদালত বন্ধ — কর্মদিবস নির্বাচন করুন।')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        caseId: item.id,
        nextHearingDate: date,
        nextHearingPurpose: purpose,
        notes,
      })
    } catch {
      setError('সংরক্ষণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border border-danger/30 bg-white p-4 shadow-sm ring-1 ring-danger/10">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-danger">{item.caseNumber}</p>
          <h3 className="mt-1 font-display text-lg font-semibold text-ink">{item.caseTitle}</h3>
          <p className="mt-1 text-sm text-muted">{item.courtName}</p>
        </div>
        <Badge variant="danger">তারিখ বাকি</Badge>
      </div>
      <p className="mt-3 rounded-lg bg-danger/5 px-3 py-2 text-sm text-ink">
        শেষ নির্ধারিত তারিখ <strong>{missed.full}</strong> চলে গেছে, কিন্তু পরবর্তী তারিখ ও সেদিনের কাজ এন্ট্রি হয়নি।
      </p>

      {canUpdate ? (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label="পরবর্তী শুনানির তারিখ *"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            hint="শুক্র–শনি বাদ দিয়ে কর্মদিবস দিন"
          />
          <Select
            label="সেই তারিখে কী হবে? *"
            required
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="নির্বাচন করুন"
            options={HEARING_PURPOSE_OPTIONS}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="নোট (ঐচ্ছিক)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="যেমন: কাগজপত্র জমা, সাক্ষী হাজির..."
            />
          </div>
          {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'তারিখ ও কাজ সাবমিট করুন'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="mt-3 text-sm text-muted">
          আপডেটের অনুমতি নেই — Lawyer বা অনুমোদিত Staff এন্ট্রি করবেন।
        </p>
      )}
    </div>
  )
}

export function HearingScheduleSections({
  cases,
  basePath = '/lawyer/cases',
  canUpdate = true,
  onCasesChange,
  mode = 'full',
}: Props) {
  const [list, setList] = useState(cases)
  const court = activeCourtDays()
  const today = court.primaryKey
  const nextDay = court.secondaryKey
  const todayMeta = formatCourtDateHeading(today)
  const nextMeta = formatCourtDateHeading(nextDay)

  useEffect(() => {
    setList(cases)
  }, [cases])

  const todayCases = useMemo(
    () => sortByNextHearing(list.filter((c) => c.nextHearingDate && isSameDateKey(c.nextHearingDate, today))),
    [list, today],
  )
  const nextCases = useMemo(
    () => sortByNextHearing(list.filter((c) => c.nextHearingDate && isSameDateKey(c.nextHearingDate, nextDay))),
    [list, nextDay],
  )
  const overdueCases = useMemo(
    () => sortByNextHearing(list.filter((c) => needsNextHearingUpdate(c.nextHearingDate, c.status))),
    [list],
  )

  const updateCase = async (payload: {
    caseId: string
    nextHearingDate: string
    nextHearingPurpose: string
    notes?: string
  }) => {
    const prev = list.find((c) => c.id === payload.caseId)
    const updated: Case = {
      ...prev!,
      lastHearingDate: prev?.nextHearingDate,
      nextHearingDate: payload.nextHearingDate,
      nextHearingPurpose: payload.nextHearingPurpose,
      status: 'Hearing Scheduled',
      importantNotes: payload.notes
        ? `${payload.notes}${prev?.importantNotes ? ` | ${prev.importantNotes}` : ''}`
        : prev?.importantNotes || '',
    }
    const nextList = list.map((c) => (c.id === payload.caseId ? updated : c))
    setList(nextList)
    onCasesChange?.(nextList)

    const mockIdx = mockCases.findIndex((c) => c.id === payload.caseId)
    if (mockIdx >= 0) mockCases[mockIdx] = updated

    try {
      await api(`/cases/${payload.caseId}/next-hearing`, {
        method: 'PATCH',
        body: payload,
      })
    } catch {
      // local update already applied (offline / mock)
    }
  }

  return (
    <div className="space-y-6">
      {court.holiday && (
        <div className="rounded-xl border border-bronze/30 bg-sand/80 px-4 py-3 text-sm text-ink">
          আজ আদালত সাপ্তাহিক ছুটি। আগামী কর্মদিবস <strong>{todayMeta.full}</strong>, তার পরের কর্মদিবস{' '}
          <strong>{nextMeta.full}</strong>।
        </div>
      )}

      {/* Today */}
      <section className="overflow-hidden rounded-2xl border border-warning/25 bg-gradient-to-br from-white via-white to-warning/5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warning/20 bg-warning/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning text-white">
              <Sunrise className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                {court.holiday ? 'আগামী কর্মদিবস' : 'আজকের মামলা'}
              </p>
              <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{todayMeta.full}</h2>
            </div>
          </div>
          <Badge variant="warning">{todayCases.length} টি মামলা</Badge>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          {todayCases.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted">
              {court.holiday
                ? 'আগামী কর্মদিবসে কোনো নির্ধারিত শুনানি নেই।'
                : 'আজকের জন্য কোনো নির্ধারিত শুনানি নেই।'}
            </p>
          ) : (
            todayCases.map((c) => (
              <CaseHearingCard key={c.id} item={c} basePath={basePath} tone="today" />
            ))
          )}
        </div>
      </section>

      {/* Next working day */}
      <section className="overflow-hidden rounded-2xl border border-teal/25 bg-gradient-to-br from-white via-white to-teal/5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal/20 bg-teal/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal text-white">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-teal">
                {court.holiday ? 'তার পরের কর্মদিবস' : 'পরবর্তী কর্মদিবস'}
              </p>
              <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">{nextMeta.full}</h2>
              <p className="mt-0.5 text-xs text-muted">শুক্র–শনি বাদ দিয়ে পরবর্তী আদালতের কর্মদিবস।</p>
            </div>
          </div>
          <Badge variant="teal">{nextCases.length} টি মামলা</Badge>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          {nextCases.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted">
              পরবর্তী কর্মদিবসে কোনো নির্ধারিত শুনানি নেই।
            </p>
          ) : (
            nextCases.map((c) => (
              <CaseHearingCard key={c.id} item={c} basePath={basePath} tone="next" />
            ))
          )}
        </div>
      </section>

      {/* Needs next date entry */}
      {mode === 'full' && (
      <section className="overflow-hidden rounded-2xl border border-danger/25 bg-gradient-to-br from-white via-white to-danger/5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-danger/20 bg-danger/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger text-white">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-danger">
                পরবর্তী তারিখ এন্ট্রি বাকি
              </p>
              <h2 className="font-display text-xl font-semibold text-ink sm:text-2xl">
                তারিখ চলে গেছে — আপডেট করুন
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                পরবর্তী তারিখ + সেদিন কী হবে — দুটো এন্ট্রি সাবমিট না হওয়া পর্যন্ত এখানে থাকবে।
              </p>
            </div>
          </div>
          <Badge variant="danger">{overdueCases.length} টি বাকি</Badge>
        </div>
        <div className="space-y-3 p-4 sm:p-5">
          {overdueCases.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-6 text-sm text-success">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              সব মামলার পরবর্তী তারিখ আপডেট করা আছে — এই তালিকা খালি।
            </div>
          ) : (
            overdueCases.map((c) => (
              <OverdueUpdateCard
                key={c.id}
                item={c}
                canUpdate={canUpdate}
                onSubmit={updateCase}
              />
            ))
          )}
        </div>
      </section>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-slate-panel px-4 py-3 text-xs text-muted">
        <Clock3 className="h-3.5 w-3.5" />
        আদালত সাপ্তাহিক ছুটি: শুক্রবার ও শনিবার · কর্মদিবস: রবি–বৃহস্পতি
      </div>
    </div>
  )
}
