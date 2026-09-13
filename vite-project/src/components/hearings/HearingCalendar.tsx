import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Hearing } from '@/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function HearingCalendar({ hearings }: { hearings: Hearing[] }) {
  const [current, setCurrent] = useState(new Date(2026, 8, 1))
  const [selected, setSelected] = useState<Date | null>(null)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [current])

  const hearingsOn = (day: Date) =>
    hearings.filter((h) => isSameDay(new Date(h.hearingDate), day))

  const selectedHearings = selected ? hearingsOn(selected) : []

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-xl border border-border bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
          <h3 className="font-display text-base font-semibold sm:text-lg">
            {format(current, 'MMMM yyyy')}
          </h3>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="touch-target px-2" onClick={() => setCurrent(subMonths(current, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="touch-target px-2" onClick={() => setCurrent(addMonths(current, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold text-muted sm:gap-1 sm:text-xs">
          {['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'].map((d) => (
            <div key={d} className="py-1.5 sm:py-2">
              <span className="sm:hidden">{d.slice(0, 1)}</span>
              <span className="hidden sm:inline">{d}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
          {days.map((day) => {
            const items = hearingsOn(day)
            const inMonth = isSameMonth(day, current)
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => setSelected(day)}
                className={cn(
                  'flex min-h-11 flex-col items-center justify-start rounded-md border p-1 text-left transition sm:min-h-16 sm:items-start sm:rounded-lg sm:p-1.5',
                  inMonth ? 'border-transparent bg-slate-panel/50' : 'border-transparent text-muted/40',
                  selected && isSameDay(day, selected) && 'border-teal bg-teal/10',
                  items.length > 0 && inMonth && 'ring-1 ring-bronze/40',
                )}
              >
                <span className="text-[11px] font-semibold sm:text-xs">{format(day, 'd')}</span>
                {items.length > 0 && (
                  <>
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-bronze sm:hidden" />
                    <span className="mt-1 hidden truncate rounded bg-bronze/15 px-1 text-[10px] font-medium text-bronze sm:block">
                      {items.length} hearing
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <h3 className="font-display text-base font-semibold sm:text-lg">
          {selected ? format(selected, 'dd MMM yyyy') : 'একটি তারিখ নির্বাচন করুন'}
        </h3>
        <div className="mt-4 space-y-3">
          {selected && selectedHearings.length === 0 && (
            <p className="text-sm text-muted">এই দিনে কোনো শুনানি নেই।</p>
          )}
          {selectedHearings.map((h) => (
            <div key={h.id} className="rounded-lg border border-border bg-slate-panel p-3">
              <p className="text-sm font-semibold text-teal">{h.caseNumber}</p>
              <p className="text-sm text-ink break-words">{h.caseTitle}</p>
              <p className="mt-1 text-xs text-muted">
                {h.hearingTime} · {h.court} · {h.hearingType}
              </p>
            </div>
          ))}
          {!selected && (
            <p className="text-sm text-muted">ক্যালেন্ডার থেকে তারিখ ক্লিক করুন।</p>
          )}
        </div>
      </div>
    </div>
  )
}
