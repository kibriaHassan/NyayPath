import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import {
  casesForCalendarDay,
  formatCourtDateHeading,
  isCourtHoliday,
  missingEntryDays,
  sortByNextHearing,
  toDateKey,
  todayKey,
  type CaseHearingRow,
} from '@/lib/courtCalendar'
import { cn } from '@/lib/utils'

const ENTERED = '#22A45D'
const MISSING = '#EF4444'
const HOLIDAY = '#D1D5DB'
const HEADER = '#1D4ED8'

const BN_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
]
const BN_DAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1)
  const pad = first.getDay()
  const count = new Date(year, month + 1, 0).getDate()
  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < pad; i += 1) {
    cells.push({ date: new Date(year, month, 1 - (pad - i)), inMonth: false })
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const prev = cells[cells.length - 1].date
    const next = new Date(prev)
    next.setDate(prev.getDate() + 1)
    cells.push({ date: next, inMonth: false })
  }
  return cells
}

function Donut({
  entered,
  missing,
}: {
  entered: number
  missing: number
}) {
  const total = entered + missing
  const size = 150
  const stroke = 18
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const enteredLen = total ? (entered / total) * c : 0
  const missingLen = total ? (missing / total) * c : 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E6EDF5" strokeWidth={stroke} />
      {total > 0 ? (
        <>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={ENTERED}
            strokeWidth={stroke}
            strokeDasharray={`${enteredLen} ${c - enteredLen}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={MISSING}
            strokeWidth={stroke}
            strokeDasharray={`${missingLen} ${c - missingLen}`}
            strokeDashoffset={-enteredLen}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </>
      ) : null}
      <text x="50%" y="48%" textAnchor="middle" className="fill-ink text-2xl font-bold">
        {total}
      </text>
      <text x="50%" y="62%" textAnchor="middle" className="fill-muted text-xs font-semibold">
        মামলা
      </text>
    </svg>
  )
}

export default function CaseCalendarPage({ basePath = '/lawyer' }: { basePath?: string }) {
  const [cases, setCases] = useState<CaseHearingRow[]>([])
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(() => todayKey())

  useEffect(() => {
    api<{ data: CaseHearingRow[] }>('/cases')
      .then((res) => setCases(res.data || []))
      .catch(() => setCases([]))
  }, [])

  const today = todayKey()
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const cells = useMemo(() => monthCells(year, month), [year, month])
  const redDays = useMemo(() => missingEntryDays(cases, today), [cases, today])
  const bucket = useMemo(() => {
    const day = casesForCalendarDay(cases, selected, today)
    return {
      ...day,
      all: sortByNextHearing(day.all),
      entered: sortByNextHearing(day.entered),
      missing: sortByNextHearing(day.missing),
    }
  }, [cases, selected, today])
  const total = bucket.all.length
  const enteredPct = total ? Math.round((bucket.entered.length / total) * 100) : 0
  const missingPct = total ? Math.round((bucket.missing.length / total) * 100) : 0
  const heading = formatCourtDateHeading(selected)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">মামলা ক্যালেন্ডার</h1>
        <p className="mt-1 text-sm text-muted">তারিখে ক্লিক করলে সেই দিনের মামলা ও পাই চার্ট দেখাবে</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between px-3 py-3 text-white" style={{ backgroundColor: HEADER }}>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-white/15"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-xl font-bold">
            {BN_MONTHS[month]} {year}
          </p>
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-white/15"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 px-2 pt-3 text-center text-xs font-bold text-muted">
          {BN_DAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 px-2 pb-3">
          {cells.map((cell) => {
            const key = toDateKey(cell.date)
            const holiday = cell.inMonth && isCourtHoliday(cell.date)
            const red = cell.inMonth && redDays.has(key)
            const isSelected = key === selected
            const isToday = key === today
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className="flex flex-col items-center py-1"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold',
                    !cell.inMonth && 'text-slate-300',
                    cell.inMonth && !red && !holiday && 'text-ink',
                    red && 'bg-[#EF4444] text-white',
                    holiday && !red && 'bg-[#D1D5DB] text-white',
                    isSelected && !red && !holiday && 'ring-2 ring-[#1D4ED8]',
                    isSelected && (red || holiday) && 'ring-2 ring-slate-900',
                  )}
                >
                  {cell.date.getDate()}
                </span>
                {isToday ? (
                  <span className="mt-1 h-0 w-0 border-x-4 border-b-[6px] border-x-transparent border-b-[#F5B942]" />
                ) : (
                  <span className="mt-1 h-1.5" />
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-white" style={{ backgroundColor: HEADER }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MISSING }} />
          তারিখ এন্ট্রি হয়নি
        </div>
      </div>

      <div className="text-center">
        <p className="text-lg font-extrabold" style={{ color: ENTERED }}>
          {heading.dateLine}
        </p>
        <p className="text-sm font-bold text-muted">সেই দিনের মামলার চার্ট</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <Donut entered={bucket.entered.length} missing={bucket.missing.length} />
        <div className="min-w-[180px] flex-1 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="h-3.5 w-3.5 rounded" style={{ backgroundColor: ENTERED }} />
            <span className="flex-1">তারিখ এন্ট্রি হয়েছে</span>
            <span>
              {bucket.entered.length} · {enteredPct}%
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className="h-3.5 w-3.5 rounded" style={{ backgroundColor: MISSING }} />
            <span className="flex-1">তারিখ এন্ট্রি হয়নি</span>
            <span>
              {bucket.missing.length} · {missingPct}%
            </span>
          </div>
        </div>
      </div>

      {bucket.all.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted">
          এই দিনে কোনো মামলা নেই।
        </p>
      ) : (
        <div className="space-y-2">
          {bucket.all.map((item) => {
            const missed = bucket.missing.some((row) => row.id === item.id)
            return (
              <Link
                key={item.id}
                to={`${basePath}/cases/${item.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 shadow-sm transition hover:border-teal/40"
              >
                <span
                  className="h-9 w-2 rounded"
                  style={{ backgroundColor: missed ? MISSING : ENTERED }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-ink">{item.caseNumber}</p>
                  <p className="truncate text-sm text-muted">
                    {item.caseTitle || item.title || item.courtName || '—'}
                  </p>
                </div>
                <span className="text-xs font-extrabold" style={{ color: missed ? MISSING : ENTERED }}>
                  {missed ? 'এন্ট্রি হয়নি' : 'এন্ট্রি হয়েছে'}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
