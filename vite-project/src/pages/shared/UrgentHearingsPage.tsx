import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Sunrise, CalendarDays } from 'lucide-react'
import { HearingScheduleSections } from '@/components/hearings/HearingScheduleSections'
import { cases, getStaffById } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import {
  formatCourtDateHeading,
  isSameDateKey,
  nextWorkingDayKey,
  todayKey,
} from '@/lib/courtCalendar'
import type { Case } from '@/types'

type RoleScope = 'lawyer' | 'staff'

export function UrgentHearingsPage({ scope }: { scope: RoleScope }) {
  const user = useAuthStore((s) => s.user)
  const basePath = scope === 'lawyer' ? '/lawyer/cases' : '/staff/cases'
  const hearingsPath = scope === 'lawyer' ? '/lawyer/hearings' : '/staff/hearings'

  const scopedCases = useMemo(() => {
    if (scope === 'lawyer') {
      return cases.filter((c) => c.ownerLawyerId === user?.id)
    }
    return cases.filter((c) => c.assignedStaffIds.includes(user?.id || ''))
  }, [scope, user?.id])

  const [list, setList] = useState<Case[]>(scopedCases)

  useEffect(() => {
    setList(scopedCases)
  }, [scopedCases])

  const today = todayKey()
  const next = nextWorkingDayKey()
  const todayMeta = formatCourtDateHeading(today)
  const nextMeta = formatCourtDateHeading(next)

  const todayCount = list.filter((c) => c.nextHearingDate && isSameDateKey(c.nextHearingDate, today)).length
  const nextCount = list.filter((c) => c.nextHearingDate && isSameDateKey(c.nextHearingDate, next)).length
  const total = todayCount + nextCount

  const staff = scope === 'staff' ? getStaffById(user?.id) : null
  const canUpdate =
    scope === 'lawyer' ||
    Boolean(staff?.permissions.editHearingDates || staff?.permissions.editCases)

  return (
    <div className="space-y-6 pb-2">
      <div className="relative overflow-hidden rounded-3xl border border-warning/20 bg-gradient-to-br from-[#fff8ef] via-white to-[#eef7ff] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)] sm:p-7">
        <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-warning/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 h-36 w-36 rounded-full bg-[#2563eb]/10 blur-2xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">
              <Flame className="h-3.5 w-3.5" />
              জরুরি শুনানি
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              আজকের ও পরবর্তী দিনের মামলা
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              শুধুমাত্র আজ ও পরবর্তী কর্মদিবসের নির্ধারিত শুনানি — দ্রুত প্রস্তুতির জন্য।
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-warning/25 bg-white/90 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-warning">
                <Sunrise className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">আজ</span>
              </div>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{todayCount}</p>
              <p className="text-[11px] text-muted">{todayMeta.weekday}</p>
            </div>
            <div className="rounded-2xl border border-[#2563eb]/20 bg-white/90 px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-[#2563eb]">
                <CalendarDays className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">পরবর্তী</span>
              </div>
              <p className="mt-1 font-display text-2xl font-semibold text-ink">{nextCount}</p>
              <p className="text-[11px] text-muted">{nextMeta.weekday}</p>
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <p className="text-sm text-ink">
            মোট <strong className="text-warning">{total}</strong> টি জরুরি মামলা
          </p>
          <Link to={hearingsPath} className="text-sm font-semibold text-[#2563eb] hover:underline">
            সম্পূর্ণ ক্যালেন্ডার →
          </Link>
        </div>
      </div>

      <HearingScheduleSections
        cases={list}
        basePath={basePath}
        canUpdate={canUpdate}
        mode="urgent"
        onCasesChange={setList}
      />
    </div>
  )
}

export function LawyerUrgentHearingsPage() {
  return <UrgentHearingsPage scope="lawyer" />
}

export function StaffUrgentHearingsPage() {
  return <UrgentHearingsPage scope="staff" />
}
