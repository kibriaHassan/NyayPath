import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  Calendar,
  Clock,
  CheckSquare,
  FileText,
  StickyNote,
  Eye,
  Bell,
  PieChart as PieChartIcon,
  LayoutGrid,
} from 'lucide-react'
import { CaseTable } from '@/components/cases/CaseTable'
import { HearingScheduleSections } from '@/components/hearings/HearingScheduleSections'
import { DashboardPieCharts, type PieChartBlock } from '@/components/dashboard/DashboardPieCharts'
import { PremiumMetricCard } from '@/components/dashboard/PremiumMetricCard'
import {
  CasePipelineCard,
  DateChip,
  DashboardListCard,
  HearingBarsCard,
  ProgressRow,
} from '@/components/dashboard/PremiumDashboardWidgets'
import { cases, hearings, tasks, getLawyerById, getStaffById } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { isToday, isUpcoming } from '@/lib/utils'
import { formatCourtDateHeading, needsNextHearingUpdate, parseDateKey } from '@/lib/courtCalendar'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import type { Case, Staff, StaffPermissions } from '@/types'

const permissionHelp: { key: keyof StaffPermissions; label: string; desc: string; icon: typeof Eye }[] = [
  { key: 'viewCases', label: 'মামলা দেখা', desc: 'অ্যাসাইন করা মামলার তথ্য দেখুন', icon: Eye },
  { key: 'editCases', label: 'মামলা এডিট', desc: 'কেস আপডেট করতে পারবেন (অনুমতি থাকলে)', icon: Briefcase },
  { key: 'viewHearingDates', label: 'শুনানির তারিখ', desc: 'Upcoming hearing list ও calendar', icon: Calendar },
  { key: 'addNotes', label: 'নোট যোগ', desc: 'কেস নোট/অতিরিক্ত তথ্য যোগ', icon: StickyNote },
  { key: 'manageDocuments', label: 'ডকুমেন্ট', desc: 'কেস ফাইল ম্যানেজমেন্ট', icon: FileText },
  { key: 'manageTasks', label: 'টাস্ক', desc: 'অ্যাসাইন করা টাস্ক দেখা ও আপডেট', icon: CheckSquare },
]

function greetingBn() {
  const h = new Date().getHours()
  if (h < 12) return 'সুপ্রভাত'
  if (h < 17) return 'শুভ অপরাহ্ন'
  return 'শুভ সন্ধ্যা'
}

const BN_SHORT = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']

export default function StaffDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [staff, setStaff] = useState<Staff | null>(() => getStaffById(user?.id) || null)
  const [lawyerName, setLawyerName] = useState('')
  const [showCharts, setShowCharts] = useState(false)
  const [assigned, setAssigned] = useState<Case[]>(() =>
    cases.filter((c) => c.assignedStaffIds.includes(user?.id || '')),
  )

  useEffect(() => {
    let cancelled = false
    api<{
      data: Staff & { lawyerName?: string; lawyerChamber?: string }
    }>('/staff/me')
      .then((res) => {
        if (cancelled) return
        setStaff(res.data)
        setLawyerName(res.data.lawyerName || '')
      })
      .catch(() => {
        const local = getStaffById(user?.id)
        setStaff(local || null)
        const lawyer = getLawyerById(user?.lawyerId || local?.lawyerId)
        setLawyerName(lawyer?.fullName || '')
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.lawyerId])

  useEffect(() => {
    setAssigned(cases.filter((c) => c.assignedStaffIds.includes(user?.id || '')))
  }, [user?.id])

  const myHearings = hearings.filter((h) => h.responsibleStaffId === user?.id)
  const upcoming = myHearings.filter((h) => isUpcoming(h.hearingDate, 30) || isToday(h.hearingDate))
  const today = myHearings.filter((h) => isToday(h.hearingDate))
  const pending = tasks.filter((t) => t.assignedStaffId === user?.id && t.status !== 'Completed')
  const completed = tasks.filter((t) => t.assignedStaffId === user?.id && t.status === 'Completed')
  const overdueCount = useMemo(
    () => assigned.filter((c) => needsNextHearingUpdate(c.nextHearingDate, c.status)).length,
    [assigned],
  )

  const perms = staff?.permissions
  const canUpdateHearing = Boolean(perms?.editHearingDates || perms?.editCases)
  const firstName = user?.name?.split(' ')[0] || 'Staff'
  const todayMeta = formatCourtDateHeading(new Date())

  const statusCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of assigned) {
      map.set(c.status, (map.get(c.status) || 0) + 1)
    }
    return map
  }, [assigned])

  const pipeline = useMemo(() => {
    const order = [
      { key: 'Pending', label: 'Pending', color: '#94a3b8' },
      { key: 'Active', label: 'Active', color: '#2563eb' },
      { key: 'Hearing Scheduled', label: 'Hearing', color: '#0ea5e9' },
      { key: 'Disposed', label: 'Disposed', color: '#14b8a6' },
      { key: 'Closed', label: 'Closed', color: '#64748b' },
    ]
    return order.map((o) => ({
      label: o.label,
      value: statusCounts.get(o.key) || 0,
      color: o.color,
    }))
  }, [statusCounts])

  const weekBars = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const h of myHearings) {
      try {
        counts[parseDateKey(h.hearingDate).getDay()] += 1
      } catch {
        /* skip */
      }
    }
    return [0, 1, 2, 3, 4].map((i) => ({ name: BN_SHORT[i], value: counts[i] }))
  }, [myHearings])

  const taskRows = useMemo(
    () =>
      pending.slice(0, 5).map((t) => ({
        id: t.id,
        title: t.title,
        pct: t.status === 'In Progress' ? 55 : 20,
        meta: t.status,
      })),
    [pending],
  )

  const charts: PieChartBlock[] = useMemo(() => {
    const statusColors: Record<string, string> = {
      Active: '#2563eb',
      'Hearing Scheduled': '#0ea5e9',
      Closed: '#64748b',
      Disposed: '#14b8a6',
      Pending: '#94a3b8',
    }
    const permOn = perms ? Object.values(perms).filter(Boolean).length : 0
    const permOff = perms ? Object.values(perms).length - permOn : 0

    return [
      {
        id: 'assigned-status',
        title: 'অ্যাসাইনড মামলার স্ট্যাটাস',
        subtitle: `মোট ${assigned.length} টি`,
        data: [...statusCounts.entries()].map(([name, value]) => ({
          name,
          value,
          color: statusColors[name] || '#9a6b3f',
        })),
      },
      {
        id: 'hearings',
        title: 'শুনানি ওভারভিউ',
        data: [
          { name: 'আজকের শুনানি', value: today.length, color: '#b7791f' },
          { name: 'আসন্ন শুনানি', value: Math.max(upcoming.length - today.length, 0), color: '#2563eb' },
          { name: 'তারিখ এন্ট্রি বাকি', value: overdueCount, color: '#b42318' },
        ],
      },
      {
        id: 'tasks-perms',
        title: 'টাস্ক ও অনুমতি',
        data: [
          { name: 'Pending Tasks', value: pending.length, color: '#9a6b3f' },
          { name: 'Completed Tasks', value: completed.length, color: '#1f7a4c' },
          { name: 'অনুমতি On', value: permOn, color: '#2563eb' },
          { name: 'অনুমতি Off', value: permOff, color: '#d5e0e3' },
        ],
      },
    ]
  }, [
    assigned.length,
    statusCounts,
    today.length,
    upcoming.length,
    overdueCount,
    pending.length,
    completed.length,
    perms,
  ])

  return (
    <div className="space-y-6 pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {greetingBn()}, {firstName}!
            {(staff?.staffCode || user?.staffCode) && (
              <span className="ml-2 font-mono text-base font-semibold text-teal md:text-lg">
                {staff?.staffCode || user?.staffCode}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {lawyerName ? `${lawyerName}-এর অধীনে` : 'এখনো উকিলের সাথে লিংক হয়নি — আপনার ID উকিলকে দিন'}
            {staff?.role ? ` · ${staff.role}` : ''} — আজ {today.length} শুনানি, {overdueCount} তারিখ বাকি।
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={staff?.active === false ? 'danger' : 'success'}>
              {staff?.active === false ? 'Disabled' : 'Active'}
            </Badge>
            {(staff?.staffCode || user?.staffCode) && (
              <Badge variant="info">ID: {staff?.staffCode || user?.staffCode}</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateChip label={todayMeta.full} />
          <Button
            variant={showCharts ? 'primary' : 'outline'}
            onClick={() => setShowCharts((v) => !v)}
            className="gap-2 rounded-xl"
          >
            {showCharts ? <LayoutGrid className="h-4 w-4" /> : <PieChartIcon className="h-4 w-4" />}
            {showCharts ? 'ওভারভিউ' : 'পাই চার্ট'}
          </Button>
        </div>
      </div>

      {showCharts ? (
        <DashboardPieCharts charts={charts} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PremiumMetricCard title="Assigned Cases" value={assigned.length} icon={Briefcase} tone="ink" delta="আপনার কেস" />
            <PremiumMetricCard title="Upcoming Hearings" value={upcoming.length} icon={Calendar} tone="info" delta="৩০ দিন" />
            <PremiumMetricCard title="Today's Hearings" value={today.length} icon={Clock} tone="warning" />
            <PremiumMetricCard
              title="তারিখ এন্ট্রি বাকি"
              value={overdueCount}
              icon={CheckSquare}
              tone={overdueCount > 0 ? 'danger' : 'success'}
              delta={overdueCount > 0 ? 'আপডেট দরকার' : 'আপ টু ডেট'}
              deltaUp={overdueCount === 0}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CasePipelineCard stages={pipeline} />
            <HearingBarsCard data={weekBars} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardListCard title="টাস্ক প্রগ্রেস" actionLabel="সব টাস্ক" actionTo="/staff/tasks">
              {taskRows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">কোনো পেন্ডিং টাস্ক নেই</p>
              ) : (
                taskRows.map((t) => (
                  <ProgressRow key={t.id} label={t.title} percent={t.pct} meta={t.meta} tone="info" />
                ))
              )}
            </DashboardListCard>

            <Card className="rounded-2xl border-border/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
              <CardHeader className="border-b-0 pb-0">
                <h3 className="font-display text-lg font-semibold text-ink">অনুমতি স্ট্যাটাস</h3>
                <p className="text-xs text-muted">Lawyer কর্তৃক নির্ধারিত</p>
              </CardHeader>
              <CardContent className="grid gap-2 pt-3 sm:grid-cols-2">
                {permissionHelp.map((item) => {
                  const allowed =
                    perms ? perms[item.key] : item.key === 'viewCases' || item.key === 'viewHearingDates'
                  const Icon = item.icon
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
                        allowed ? 'border-[#2563eb]/25 bg-[#2563eb]/5' : 'border-border bg-slate-panel opacity-70'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${allowed ? 'text-[#2563eb]' : 'text-muted'}`} />
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{item.label}</p>
                      <Badge variant={allowed ? 'success' : 'muted'}>{allowed ? 'On' : 'Off'}</Badge>
                    </div>
                  )
                })}
                <div className="rounded-xl border border-bronze/30 bg-sand/50 p-3 sm:col-span-2">
                  <div className="flex items-start gap-2">
                    <Bell className="mt-0.5 h-4 w-4 text-bronze" />
                    <p className="text-sm text-ink">
                      দ্রুত এক্সেস:{' '}
                      <Link className="font-semibold text-[#2563eb]" to="/staff/cases">
                        Cases
                      </Link>
                      {' · '}
                      <Link className="font-semibold text-[#2563eb]" to="/staff/hearings">
                        Hearings
                      </Link>
                      {' · '}
                      <Link className="font-semibold text-[#2563eb]" to="/staff/tasks">
                        Tasks
                      </Link>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <HearingScheduleSections
            cases={assigned}
            basePath="/staff/cases"
            canUpdate={canUpdateHearing}
            onCasesChange={setAssigned}
          />

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">My Assigned Cases</h2>
              <Link to="/staff/cases" className="text-sm font-semibold text-[#2563eb]">
                সব দেখুন
              </Link>
            </div>
            <CaseTable cases={assigned} basePath="/staff/cases" showStaff={false} />
          </section>
        </>
      )}
    </div>
  )
}
