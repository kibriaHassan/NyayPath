import { Link } from 'react-router-dom'
import {
  Briefcase,
  Calendar,
  CheckSquare,
  Users,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { CaseTable } from '@/components/cases/CaseTable'
import { Button } from '@/components/ui/Button'
import { cases, hearings, staffMembers, tasks } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { isToday, isUpcoming } from '@/lib/utils'

export default function LawyerDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const myCases = cases.filter((c) => c.ownerLawyerId === user?.id)
  const myStaff = staffMembers.filter((s) => s.lawyerId === user?.id && s.active)
  const myHearings = hearings.filter((h) => h.lawyerId === user?.id)
  const upcoming = myHearings.filter((h) => isUpcoming(h.hearingDate, 30) || isToday(h.hearingDate))
  const today = myHearings.filter((h) => isToday(h.hearingDate))
  const pendingTasks = tasks.filter((t) => t.lawyerId === user?.id && t.status !== 'Completed')
  const activeCases = myCases.filter((c) => c.status === 'Active' || c.status === 'Hearing Scheduled')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted">স্বাগতম, {user?.name}</p>
        </div>
        <Link to="/lawyer/cases/new">
          <Button>নতুন মামলা যোগ করুন</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Total Cases" value={myCases.length} icon={Briefcase} tone="ink" />
        <StatCard title="Active Cases" value={activeCases.length} icon={AlertCircle} tone="teal" />
        <StatCard title="Upcoming Hearings" value={upcoming.length} icon={Calendar} tone="bronze" />
        <StatCard title="Today's Hearings" value={today.length} icon={Clock} tone="warning" />
        <StatCard title="Total Staff" value={myStaff.length} icon={Users} tone="info" />
        <StatCard title="Pending Tasks" value={pendingTasks.length} icon={CheckSquare} tone="teal" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Upcoming Hearings</h2>
          <Link to="/lawyer/hearings" className="text-sm font-semibold text-teal">
            সব দেখুন
          </Link>
        </div>
        <CaseTable
          cases={myCases
            .filter((c) => isUpcoming(c.nextHearingDate, 45) || isToday(c.nextHearingDate))
            .sort((a, b) => +new Date(a.nextHearingDate) - +new Date(b.nextHearingDate))}
        />
      </section>
    </div>
  )
}
