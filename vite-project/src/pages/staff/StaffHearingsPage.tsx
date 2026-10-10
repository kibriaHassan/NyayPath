import { useEffect, useState } from 'react'
import { HearingCalendar } from '@/components/hearings/HearingCalendar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { formatDate, isToday, isUpcoming } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Hearing, Staff, StaffPermissions } from '@/types'

export default function StaffHearingsPage() {
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [perms, setPerms] = useState<StaffPermissions | null>(null)
  const [myHearings, setMyHearings] = useState<Hearing[]>([])

  useEffect(() => {
    api<{ data: Staff }>('/staff/me')
      .then((res) => setPerms(res.data.permissions))
      .catch(() => setPerms(null))
    api<{ data: Hearing[] }>('/hearings')
      .then((res) =>
        setMyHearings(
          (res.data || []).slice().sort((a, b) => +new Date(a.hearingDate) - +new Date(b.hearingDate)),
        ),
      )
      .catch(() => setMyHearings([]))
  }, [])

  if (perms && !perms.viewHearingDates && !perms.editHearingDates) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 text-center text-muted">
        আপনার Hearing Dates দেখার অনুমতি নেই।
      </div>
    )
  }

  const columns: Column<Hearing>[] = [
    { key: 'num', header: 'Case Number', render: (r) => <span className="font-semibold text-teal">{r.caseNumber}</span> },
    { key: 'title', header: 'Case Title', render: (r) => r.caseTitle },
    { key: 'court', header: 'Court', render: (r) => r.court },
    {
      key: 'date',
      header: 'Date',
      render: (r) => (
        <span className={cn((isToday(r.hearingDate) || isUpcoming(r.hearingDate, 7)) && 'font-semibold text-warning')}>
          {formatDate(r.hearingDate)} · {r.hearingTime}
        </span>
      ),
    },
    { key: 'type', header: 'Type', render: (r) => r.hearingType },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Upcoming Hearings</h1>
          <p className="text-sm text-muted">আপনার দায়িত্বে থাকা শুনানি</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'list' ? 'primary' : 'outline'} size="sm" onClick={() => setView('list')}>
            List
          </Button>
          <Button variant={view === 'calendar' ? 'primary' : 'outline'} size="sm" onClick={() => setView('calendar')}>
            Calendar
          </Button>
        </div>
      </div>
      {view === 'list' ? <DataTable columns={columns} data={myHearings} /> : <HearingCalendar hearings={myHearings} />}
    </div>
  )
}
