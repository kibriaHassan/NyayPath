import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { CaseTable } from '@/components/cases/CaseTable'
import { cases, hearings, tasks, getLawyerById, getStaffById } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { isToday, isUpcoming } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { api } from '@/lib/api'
import type { Staff, StaffPermissions } from '@/types'

const permissionHelp: { key: keyof StaffPermissions; label: string; desc: string; icon: typeof Eye }[] = [
  { key: 'viewCases', label: 'মামলা দেখা', desc: 'অ্যাসাইন করা মামলার তথ্য দেখুন', icon: Eye },
  { key: 'editCases', label: 'মামলা এডিট', desc: 'কেস আপডেট করতে পারবেন (অনুমতি থাকলে)', icon: Briefcase },
  { key: 'viewHearingDates', label: 'শুনানির তারিখ', desc: 'Upcoming hearing list ও calendar', icon: Calendar },
  { key: 'addNotes', label: 'নোট যোগ', desc: 'কেস নোট/অতিরিক্ত তথ্য যোগ', icon: StickyNote },
  { key: 'manageDocuments', label: 'ডকুমেন্ট', desc: 'কেস ফাইল ম্যানেজমেন্ট', icon: FileText },
  { key: 'manageTasks', label: 'টাস্ক', desc: 'অ্যাসাইন করা টাস্ক দেখা ও আপডেট', icon: CheckSquare },
]

export default function StaffDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [staff, setStaff] = useState<Staff | null>(() => getStaffById(user?.id) || null)
  const [lawyerName, setLawyerName] = useState('')

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

  const assigned = cases.filter((c) => c.assignedStaffIds.includes(user?.id || ''))
  const myHearings = hearings.filter((h) => h.responsibleStaffId === user?.id)
  const upcoming = myHearings.filter((h) => isUpcoming(h.hearingDate, 30) || isToday(h.hearingDate))
  const today = myHearings.filter((h) => isToday(h.hearingDate))
  const pending = tasks.filter((t) => t.assignedStaffId === user?.id && t.status !== 'Completed')

  const perms = staff?.permissions

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold md:text-3xl">Staff Dashboard</h1>
        <p className="text-sm text-muted">
          স্বাগতম, {user?.name}
          {staff?.role ? ` · ${staff.role}` : ''}
          {lawyerName ? ` · ${lawyerName}-এর অধীনে` : ''}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant={staff?.active === false ? 'danger' : 'success'}>
            {staff?.active === false ? 'Disabled' : 'Active'}
          </Badge>
          {perms &&
            Object.entries(perms)
              .filter(([, v]) => v)
              .slice(0, 5)
              .map(([k]) => (
                <Badge key={k} variant="teal">
                  {k}
                </Badge>
              ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-lg font-semibold">Staff হিসেবে আপনি যা করতে পারবেন</h2>
          <p className="text-sm text-muted">শুধুমাত্র আপনার Lawyer-এর অ্যাসাইন করা তথ্য — অন্য উকিলের কিছু দেখা যাবে না।</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {permissionHelp.map((item) => {
            const allowed = perms ? perms[item.key] : item.key === 'viewCases' || item.key === 'viewHearingDates'
            const Icon = item.icon
            return (
              <div
                key={item.key}
                className={`rounded-xl border p-3 ${allowed ? 'border-teal/30 bg-teal/5' : 'border-border bg-slate-panel opacity-60'}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${allowed ? 'text-teal' : 'text-muted'}`} />
                  <p className="text-sm font-semibold text-ink">{item.label}</p>
                  <Badge variant={allowed ? 'success' : 'muted'} className="ml-auto">
                    {allowed ? 'On' : 'Off'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted">{item.desc}</p>
              </div>
            )
          })}
          <div className="rounded-xl border border-bronze/30 bg-sand/50 p-3 sm:col-span-2 lg:col-span-3">
            <div className="flex items-start gap-2">
              <Bell className="mt-0.5 h-4 w-4 text-bronze" />
              <p className="text-sm text-ink">
                দ্রুত এক্সেস: <Link className="font-semibold text-teal" to="/staff/cases">My Cases</Link>
                {' · '}
                <Link className="font-semibold text-teal" to="/staff/hearings">Hearings</Link>
                {' · '}
                <Link className="font-semibold text-teal" to="/staff/tasks">Tasks</Link>
                {' · '}
                <Link className="font-semibold text-teal" to="/staff/documents">Documents</Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Assigned Cases" value={assigned.length} icon={Briefcase} tone="ink" />
        <StatCard title="Upcoming Hearings" value={upcoming.length} icon={Calendar} tone="bronze" />
        <StatCard title="Today's Hearings" value={today.length} icon={Clock} tone="warning" />
        <StatCard title="Pending Tasks" value={pending.length} icon={CheckSquare} tone="teal" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">My Assigned Cases</h2>
          <Link to="/staff/cases" className="text-sm font-semibold text-teal">
            সব দেখুন
          </Link>
        </div>
        <CaseTable cases={assigned} basePath="/staff/cases" showStaff={false} />
        {assigned.length === 0 && (
          <p className="mt-3 text-sm text-muted">
            এখনো কোনো মামলা অ্যাসাইন নেই। Lawyer ড্যাশবোর্ড থেকে আপনাকে কেস অ্যাসাইন করলে এখানে দেখাবে।
            Demo দেখতে <strong>mahmud@nyaypath.bd</strong> দিয়ে লগইন করুন।
          </p>
        )}
      </section>
    </div>
  )
}
