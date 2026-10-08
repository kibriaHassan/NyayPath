/** Court calendar — Fri & Sat closed; today rolls at local midnight */

const BN_WEEKDAYS = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
]

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

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

export function toBnDigits(value: string | number) {
  return String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)])
}

export function startOfDay(date: Date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function parseDateKey(date: string) {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isCourtHoliday(date: Date) {
  const day = date.getDay()
  return day === 5 || day === 6
}

export function addDays(date: Date, days: number) {
  const d = startOfDay(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Next court working day after `from` (skips Fri–Sat) */
export function getNextWorkingDay(from: Date = new Date()) {
  const d = startOfDay(from)
  d.setDate(d.getDate() + 1)
  while (isCourtHoliday(d)) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

export function nextWorkingDayKey(from: Date = new Date()) {
  return toDateKey(getNextWorkingDay(from))
}

/** Local calendar day — changes after midnight automatically */
export function todayKey(from: Date = new Date()) {
  return toDateKey(startOfDay(from))
}

export function formatCourtDateHeading(date: Date | string) {
  const d = typeof date === 'string' ? parseDateKey(date) : date
  const weekday = BN_WEEKDAYS[d.getDay()]
  const day = toBnDigits(d.getDate())
  const month = BN_MONTHS[d.getMonth()]
  const year = toBnDigits(d.getFullYear())
  return {
    weekday,
    dateLine: `${day} ${month} ${year}`,
    full: `${weekday} · ${day} ${month} ${year}`,
    iso: toDateKey(d),
  }
}

export function isSameDateKey(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10)
}

export function isPastDate(date: string, relativeTo: Date = new Date()) {
  return startOfDay(parseDateKey(date)).getTime() < startOfDay(relativeTo).getTime()
}

export function isClosedCaseStatus(status: string) {
  return status === 'Closed' || status === 'Disposed'
}

/** Hearing date passed & case still open → needs next date entry */
export function needsNextHearingUpdate(
  nextHearingDate: string | undefined,
  status: string,
  relativeTo: Date = new Date(),
) {
  if (!nextHearingDate || isClosedCaseStatus(status)) return false
  return isPastDate(nextHearingDate, relativeTo)
}

export const HEARING_PURPOSE_OPTIONS = [
  { value: 'জবাবদাখি', label: 'জবাবদাখি' },
  { value: 'সাক্ষ্য গ্রহণ', label: 'সাক্ষ্য গ্রহণ' },
  { value: 'আর্গুমেন্ট', label: 'আর্গুমেন্ট' },
  { value: 'জামিন শুনানি', label: 'জামিন শুনানি' },
  { value: 'আদেশ / অর্ডার', label: 'আদেশ / অর্ডার' },
  { value: 'মেনশন', label: 'মেনশন' },
  { value: 'স্থগিতাদেশ', label: 'স্থগিতাদেশ' },
  { value: 'রায় ঘোষণা', label: 'রায় ঘোষণা' },
  { value: 'অন্যান্য', label: 'অন্যান্য' },
]

export type DayCaseFilter = 'today' | 'next' | 'pending'

export type CaseHearingRow = {
  id: string
  caseNumber: string
  caseTitle?: string
  title?: string
  courtName?: string
  status?: string
  nextHearingDate?: string
  nextHearingPurpose?: string
  lastHearingDate?: string
  district?: string
  division?: string
}

function dayOf(value?: string) {
  return value ? value.slice(0, 10) : ''
}

/** Cases tied to a calendar day, split by whether the next date was entered. */
export function casesForCalendarDay(list: CaseHearingRow[], day: string, today: string) {
  const entered: CaseHearingRow[] = []
  const missing: CaseHearingRow[] = []
  for (const item of list) {
    if (isClosedCaseStatus(item.status || '')) continue
    const next = dayOf(item.nextHearingDate)
    const last = dayOf(item.lastHearingDate)
    if (next === day && day < today) {
      missing.push(item)
      continue
    }
    if (last === day && next && next > day) {
      entered.push(item)
      continue
    }
    if (next === day && day >= today) entered.push(item)
  }
  return { entered, missing, all: [...missing, ...entered] }
}

/** Days that stay red: at least one open case still has that past hearing date. */
export function missingEntryDays(list: CaseHearingRow[], today: string) {
  const days = new Set<string>()
  for (const item of list) {
    if (isClosedCaseStatus(item.status || '')) continue
    const next = dayOf(item.nextHearingDate)
    if (next && next < today) days.add(next)
  }
  return days
}

export function partitionDayCases(list: CaseHearingRow[], now: Date = new Date()) {
  const today = todayKey(now)
  const next = nextWorkingDayKey(now)
  const todayCases = list.filter(
    (c) => c.nextHearingDate && isSameDateKey(c.nextHearingDate, today),
  )
  const nextCases = list.filter(
    (c) => c.nextHearingDate && isSameDateKey(c.nextHearingDate, next),
  )
  const pendingCases = list.filter((c) =>
    needsNextHearingUpdate(c.nextHearingDate, c.status || ''),
  )
  return {
    today,
    next,
    todayMeta: formatCourtDateHeading(today),
    nextMeta: formatCourtDateHeading(next),
    todayCases,
    nextCases,
    pendingCases,
  }
}
