import { useParams, Link } from 'react-router-dom'
import { getStaffById, cases } from '@/data/mock'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import type { StaffPermissions } from '@/types'

const labels: Record<keyof StaffPermissions, string> = {
  viewCases: 'View Cases',
  editCases: 'Edit Cases',
  addCase: 'Add Case',
  viewHearingDates: 'View Hearing Dates',
  editHearingDates: 'Edit Hearing Dates',
  manageDocuments: 'Manage Documents',
  addNotes: 'Add Notes',
  manageTasks: 'Manage Tasks',
}

export default function LawyerStaffDetailsPage() {
  const { id } = useParams()
  const staff = getStaffById(id)

  if (!staff) return <p className="text-muted">স্টাফ পাওয়া যায়নি।</p>

  const assigned = cases.filter((c) => c.assignedStaffIds.includes(staff.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <img src={staff.photo} alt="" className="h-16 w-16 rounded-full border border-border" />
          <div>
            <h1 className="font-display text-2xl font-semibold">{staff.name}</h1>
            <p className="text-sm text-muted">{staff.role}</p>
          </div>
          <Badge variant={staff.active ? 'success' : 'danger'}>
            {staff.active ? 'Active' : 'Disabled'}
          </Badge>
        </div>
        <Link to="/lawyer/staff">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Contact</h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Email: {staff.email}</p>
            <p>Mobile: {staff.mobile}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Permissions</h2>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {(Object.keys(labels) as (keyof StaffPermissions)[]).map((key) => (
              <div key={key} className="flex items-center justify-between rounded-lg bg-slate-panel px-3 py-2 text-sm">
                <span>{labels[key]}</span>
                <Badge variant={staff.permissions[key] ? 'success' : 'muted'}>
                  {staff.permissions[key] ? 'On' : 'Off'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Assigned Cases ({assigned.length})</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {assigned.map((c) => (
            <Link
              key={c.id}
              to={`/lawyer/cases/${c.id}`}
              className="block rounded-lg border border-border px-3 py-2 text-sm hover:bg-mist"
            >
              <span className="font-semibold text-teal">{c.caseNumber}</span> — {c.caseTitle}
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
