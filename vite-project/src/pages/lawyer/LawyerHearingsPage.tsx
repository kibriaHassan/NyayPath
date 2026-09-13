import { useState } from 'react'
import { hearings, getStaffById } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { HearingCalendar } from '@/components/hearings/HearingCalendar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { formatDate, isToday, isUpcoming } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Hearing } from '@/types'

export default function LawyerHearingsPage() {
  const user = useAuthStore((s) => s.user)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const myHearings = hearings
    .filter((h) => h.lawyerId === user?.id)
    .sort((a, b) => +new Date(a.hearingDate) - +new Date(b.hearingDate))

  const columns: Column<Hearing>[] = [
    { key: 'num', header: 'Case Number', render: (r) => <span className="font-semibold text-teal">{r.caseNumber}</span> },
    { key: 'title', header: 'Case Title', render: (r) => r.caseTitle },
    { key: 'court', header: 'Court', render: (r) => r.court },
    {
      key: 'date',
      header: 'Next Date',
      render: (r) => (
        <span className={cn((isToday(r.hearingDate) || isUpcoming(r.hearingDate, 7)) && 'font-semibold text-warning')}>
          {formatDate(r.hearingDate)} {r.hearingTime}
        </span>
      ),
    },
    {
      key: 'staff',
      header: 'Responsible Staff',
      render: (r) => getStaffById(r.responsibleStaffId)?.name || '—',
    },
    { key: 'type', header: 'Status', render: (r) => r.hearingType },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Upcoming Hearings</h1>
          <p className="text-sm text-muted">List ও Calendar ভিউ</p>
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

      {view === 'list' ? (
        <DataTable
          columns={columns}
          data={myHearings}
          rowClassName={(r) =>
            isToday(r.hearingDate) || isUpcoming(r.hearingDate, 3) ? 'bg-warning/5' : undefined
          }
        />
      ) : (
        <HearingCalendar hearings={myHearings} />
      )}
    </div>
  )
}
