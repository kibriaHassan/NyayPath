import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { cases, getStaffById } from '@/data/mock'
import { api, ApiError } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import type { Staff, StaffPermissions, StaffRole } from '@/types'

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
  const [staff, setStaff] = useState<Staff | null>(() => getStaffById(id) || null)
  const [perms, setPerms] = useState<StaffPermissions | null>(staff?.permissions || null)
  const [role, setRole] = useState<StaffRole>(staff?.role || 'Legal Assistant')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api<{ data: Staff }>(`/staff/${id}`)
      .then((res) => {
        setStaff(res.data)
        setPerms(res.data.permissions)
        setRole(res.data.role)
      })
      .catch(() => {
        const local = getStaffById(id)
        setStaff(local || null)
        setPerms(local?.permissions || null)
        if (local) setRole(local.role)
      })
  }, [id])

  if (!staff || !perms) return <p className="text-muted">স্টাফ পাওয়া যায়নি।</p>

  const assigned = cases.filter((c) => c.assignedStaffIds.includes(staff.id))

  const onSave = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const res = await api<{ data: Staff }>(`/staff/${staff.id}`, {
        method: 'PATCH',
        body: { permissions: perms, role },
      })
      setStaff(res.data)
      setPerms(res.data.permissions)
      setRole(res.data.role)
      setMessage('পারমিশন আপডেট হয়েছে।')
    } catch (err) {
      if (err instanceof ApiError && err.status < 500) {
        setError(err.message)
      } else {
        // mock fallback
        staff.permissions = { ...perms }
        staff.role = role
        setStaff({ ...staff })
        setMessage('পারমিশন আপডেট হয়েছে (লোকাল)।')
      }
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <img src={staff.photo} alt="" className="h-16 w-16 rounded-full border border-border" />
          <div>
            <h1 className="font-display text-2xl font-semibold">
              {staff.name}{' '}
              <span className="font-mono text-base font-semibold text-teal">{staff.staffCode}</span>
            </h1>
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

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            try {
              const res = await api<{ data: Staff }>(`/staff/${staff.id}/access`, {
                method: 'PATCH',
                body: { active: !staff.active },
              })
              setStaff(res.data)
            } catch {
              staff.active = !staff.active
              setStaff({ ...staff })
            }
          }}
        >
          {staff.active ? 'Disable' : 'Enable'}
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={async () => {
            if (
              !confirm(
                `"${staff.name}" ডিলিট করবেন? অ্যাসাইন মামলা আপনার কাছে ফিরে আসবে।`,
              )
            )
              return
            try {
              await api(`/staff/${staff.id}`, { method: 'DELETE' })
              window.location.href = '/lawyer/staff'
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'ডিলিট ব্যর্থ')
            }
          }}
        >
          Delete from team
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Contact</h2>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Staff ID:{' '}
              <span className="font-mono font-semibold text-teal">{staff.staffCode}</span>
            </p>
            <p>Email: {staff.email}</p>
            <p>Mobile: {staff.mobile}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Permissions (Edit)</h2>
              <Button size="sm" onClick={onSave} disabled={saving}>
                {saving ? 'সংরক্ষণ...' : 'Save Changes'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              options={[
                { value: 'Case Manager', label: 'Case Manager' },
                { value: 'Legal Assistant', label: 'Legal Assistant' },
                { value: 'Office Assistant', label: 'Office Assistant' },
              ]}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(labels) as (keyof StaffPermissions)[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-panel px-3 py-2 text-sm"
                >
                  <span>{labels[key]}</span>
                  <input
                    type="checkbox"
                    checked={perms[key]}
                    onChange={(e) => setPerms((p) => (p ? { ...p, [key]: e.target.checked } : p))}
                  />
                </label>
              ))}
            </div>
            {message && <p className="text-sm text-success">{message}</p>}
            {error && <p className="text-sm text-danger">{error}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Assigned Cases ({assigned.length})</h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {assigned.length === 0 && (
            <p className="text-sm text-muted">এখনো কোনো মামলা অ্যাসাইন করা হয়নি।</p>
          )}
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
