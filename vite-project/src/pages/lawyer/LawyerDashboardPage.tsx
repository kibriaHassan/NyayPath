import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Briefcase,
  Calendar,
  CheckSquare,
  Users,
  Clock,
  AlertCircle,
  PieChart as PieChartIcon,
  LayoutGrid,
  Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
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
import { Badge } from '@/components/ui/Badge'
import { cases as mockCases, hearings as mockHearings, staffMembers, tasks as mockTasks } from '@/data/mock'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { isToday, isUpcoming } from '@/lib/utils'
import { formatCourtDateHeading, needsNextHearingUpdate, parseDateKey } from '@/lib/courtCalendar'
import type { Case, Hearing, Staff, Task } from '@/types'

function greetingBn() {
  const h = new Date().getHours()
  if (h < 12) return 'সুপ্রভাত'
  if (h < 17) return 'শুভ অপরাহ্ন'
  return 'শুভ সন্ধ্যা'
}

const BN_SHORT = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']

function lawyerOwnsCase(c: Case, lawyerId?: string) {
  if (!lawyerId) return false
  return (
    c.ownerLawyerId === lawyerId ||
    c.plaintiffLawyerId === lawyerId ||
    c.defendantLawyerId === lawyerId
  )
}

export default function LawyerDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const [myCases, setMyCases] = useState<Case[]>([])
  const [myHearings, setMyHearings] = useState<Hearing[]>([])
  const [myStaff, setMyStaff] = useState<Staff[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [showCharts, setShowCharts] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const lid = user?.id
    Promise.all([
      api<{ data: Case[] }>('/cases').catch(() => ({
        data: mockCases.filter((c) => lawyerOwnsCase(c, lid)),
      })),
      api<{ data: Hearing[] }>('/hearings').catch(() => ({
        data: mockHearings.filter((h) => h.lawyerId === lid),
      })),
      api<{ data: Staff[] }>('/staff').catch(() => ({
        data: staffMembers.filter((s) => s.lawyerId === lid && s.active),
      })),
      api<{ data: Task[] }>('/tasks').catch(() => ({
        data: mockTasks.filter((t) => t.lawyerId === lid),
      })),
    ])
      .then(([caseRes, hearingRes, staffRes, taskRes]) => {
        if (cancelled) return
        const cases = caseRes.data || []
        setMyCases(cases)
        const caseIds = new Set(cases.map((c) => c.id))
        const hearings = (hearingRes.data || []).filter(
          (h) => h.lawyerId === lid || caseIds.has(h.caseId),
        )
        setMyHearings(hearings)
        setMyStaff((staffRes.data || []).filter((s) => s.active !== false))
        setMyTasks(taskRes.data || [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, location.key])

  const upcoming = myHearings.filter((h) => isUpcoming(h.hearingDate, 30) || isToday(h.hearingDate))
  const today = myHearings.filter((h) => isToday(h.hearingDate))
  const pendingTasks = myTasks.filter((t) => t.status !== 'Completed')
  const completedTasks = myTasks.filter((t) => t.status === 'Completed')
  const activeCases = myCases.filter((c) => c.status === 'Active' || c.status === 'Hearing Scheduled')
  const closedCases = myCases.filter((c) => c.status === 'Closed' || c.status === 'Disposed')
  const overdueCount = useMemo(
    () => myCases.filter((c) => needsNextHearingUpdate(c.nextHearingDate, c.status)).length,
    [myCases],
  )

  const todayMeta = formatCourtDateHeading(new Date())
  const firstName = user?.name?.split(' ')[0] || 'Lawyer'

  const statusCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of myCases) {
      map.set(c.status, (map.get(c.status) || 0) + 1)
    }
    return map
  }, [myCases])

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
        const d = parseDateKey(h.hearingDate)
        counts[d.getDay()] += 1
      } catch {
        /* skip */
      }
    }
    return [0, 1, 2, 3, 4].map((i) => ({ name: BN_SHORT[i], value: counts[i] }))
  }, [myHearings])

  const recentCases = useMemo(
    () =>
      [...myCases]
        .sort((a, b) => (b.filingDate || '').localeCompare(a.filingDate || ''))
        .slice(0, 5),
    [myCases],
  )

  const taskRows = useMemo(() => {
    return pendingTasks.slice(0, 5).map((t) => {
      const pct = t.status === 'In Progress' ? 55 : t.status === 'Completed' ? 100 : 20
      return { id: t.id, title: t.title, pct, meta: t.status }
    })
  }, [pendingTasks])

  const charts: PieChartBlock[] = useMemo(() => {
    const statusColors: Record<string, string> = {
      Active: '#2563eb',
      'Hearing Scheduled': '#0ea5e9',
      Closed: '#64748b',
      Disposed: '#14b8a6',
      Pending: '#94a3b8',
    }
    return [
      {
        id: 'cases-status',
        title: 'মামলার স্ট্যাটাস',
        subtitle: `মোট ${myCases.length} টি মামলা`,
        data: [...statusCounts.entries()].map(([name, value]) => ({
          name,
          value,
          color: statusColors[name] || '#9a6b3f',
        })),
      },
      {
        id: 'hearings',
        title: 'শুনানি ওভারভিউ',
        subtitle: 'আজ / আসন্ন / তারিখ বাকি',
        data: [
          { name: 'আজকের শুনানি', value: today.length, color: '#b7791f' },
          { name: 'আসন্ন শুনানি', value: Math.max(upcoming.length - today.length, 0), color: '#2563eb' },
          { name: 'তারিখ এন্ট্রি বাকি', value: overdueCount, color: '#b42318' },
        ],
      },
      {
        id: 'workload',
        title: 'কাজ ও স্টাফ',
        subtitle: 'টাস্ক ও টিম',
        data: [
          { name: 'Pending Tasks', value: pendingTasks.length, color: '#9a6b3f' },
          { name: 'Completed Tasks', value: completedTasks.length, color: '#1f7a4c' },
          { name: 'Active Staff', value: myStaff.length, color: '#1d6a9a' },
          { name: 'Active Cases', value: activeCases.length, color: '#2563eb' },
          { name: 'Closed Cases', value: closedCases.length, color: '#64748b' },
        ],
      },
    ]
  }, [
    myCases.length,
    statusCounts,
    today.length,
    upcoming.length,
    overdueCount,
    pendingTasks.length,
    completedTasks.length,
    myStaff.length,
    activeCases.length,
    closedCases.length,
  ])

  return (
    <div className="space-y-6 pb-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {greetingBn()}, {firstName}!
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            {loading
              ? 'ড্যাশবোর্ড লোড হচ্ছে…'
              : `আজ ${today.length} টি শুনানি, ${overdueCount} টি তারিখ আপডেট বাকি, এবং ${pendingTasks.length} টি টাস্ক অপেক্ষমাণ।`}
          </p>
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
          <Link to="/lawyer/cases/new">
            <Button className="gap-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8]">
              <Plus className="h-4 w-4" />
              নতুন মামলা
            </Button>
          </Link>
        </div>
      </div>

      {showCharts ? (
        <DashboardPieCharts charts={charts} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PremiumMetricCard
              title="মোট মামলা"
              value={myCases.length}
              icon={Briefcase}
              tone="ink"
              delta={`${activeCases.length} সক্রিয়`}
              deltaUp
              hint="সব কেস"
            />
            <PremiumMetricCard
              title="আজকের শুনানি"
              value={today.length}
              icon={Clock}
              tone="warning"
              delta={today.length > 0 ? 'আজকেই' : 'খালি'}
              deltaUp={today.length === 0}
              hint="Today"
            />
            <PremiumMetricCard
              title="আসন্ন শুনানি"
              value={upcoming.length}
              icon={Calendar}
              tone="info"
              delta="৩০ দিন"
              hint="Upcoming"
            />
            <PremiumMetricCard
              title="তারিখ এন্ট্রি বাকি"
              value={overdueCount}
              icon={CheckSquare}
              tone={overdueCount > 0 ? 'danger' : 'success'}
              delta={overdueCount > 0 ? 'আপডেট দরকার' : 'আপ টু ডেট'}
              deltaUp={overdueCount === 0}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PremiumMetricCard title="Active Cases" value={activeCases.length} icon={AlertCircle} tone="teal" />
            <PremiumMetricCard title="Staff" value={myStaff.length} icon={Users} tone="info" />
            <PremiumMetricCard
              title="Pending Tasks"
              value={pendingTasks.length}
              icon={CheckSquare}
              tone="bronze"
            />
            <PremiumMetricCard title="Closed / Disposed" value={closedCases.length} icon={Briefcase} tone="ink" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CasePipelineCard stages={pipeline} />
            <HearingBarsCard data={weekBars} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardListCard title="সাম্প্রতিক মামলা" subtitle="নতুন ফাইলিং" actionLabel="সব দেখুন" actionTo="/lawyer/cases">
              <ul className="divide-y divide-border/70">
                {recentCases.length === 0 && (
                  <li className="py-6 text-center text-sm text-muted">কোনো মামলা নেই</li>
                )}
                {recentCases.map((c) => {
                  const initials = (c.caseTitle || '—')
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                  return (
                    <li key={c.id}>
                      <Link
                        to={`/lawyer/cases/${c.id}`}
                        className="flex items-center gap-3 py-3 transition hover:bg-slate-panel/60"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563eb]/10 text-xs font-bold text-[#2563eb]">
                          {initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{c.caseTitle}</p>
                          <p className="truncate text-xs text-muted">
                            {c.caseNumber} · {c.courtName}
                          </p>
                        </div>
                        <Badge variant="muted">{c.status}</Badge>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </DashboardListCard>

            <DashboardListCard title="টাস্ক প্রগ্রেস" subtitle="চলমান কাজ" actionLabel="সব টাস্ক" actionTo="/lawyer/tasks">
              {taskRows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">কোনো পেন্ডিং টাস্ক নেই</p>
              ) : (
                taskRows.map((t) => (
                  <ProgressRow key={t.id} label={t.title} percent={t.pct} meta={t.meta} tone="info" />
                ))
              )}
            </DashboardListCard>
          </div>

          <HearingScheduleSections
            cases={myCases}
            basePath="/lawyer/cases"
            canUpdate
            onCasesChange={(next: Case[]) => setMyCases(next)}
          />

          <div className="flex justify-end">
            <Link to="/lawyer/hearings" className="text-sm font-semibold text-[#2563eb]">
              সম্পূর্ণ Hearing Calendar দেখুন →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
