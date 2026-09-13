import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { staffMembers } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { DataTable, type Column } from '@/components/ui/DataTable'
import type { Staff, StaffPermissions } from '@/types'

const permissionLabels: { key: keyof StaffPermissions; label: string }[] = [
  { key: 'viewCases', label: 'View Cases' },
  { key: 'editCases', label: 'Edit Cases' },
  { key: 'addCase', label: 'Add Case' },
  { key: 'viewHearingDates', label: 'View Hearing Dates' },
  { key: 'editHearingDates', label: 'Edit Hearing Dates' },
  { key: 'manageDocuments', label: 'Manage Documents' },
  { key: 'addNotes', label: 'Add Notes' },
  { key: 'manageTasks', label: 'Manage Tasks' },
]

export default function LawyerStaffPage() {
  const user = useAuthStore((s) => s.user)
  const [list, setList] = useState(() => staffMembers.filter((s) => s.lawyerId === user?.id))
  const [open, setOpen] = useState(false)

  const columns: Column<Staff>[] = [
    {
      key: 'name',
      header: 'Staff',
      render: (r) => (
        <div className="flex items-center gap-3">
          <img src={r.photo} alt="" className="h-9 w-9 rounded-full" />
          <div>
            <p className="font-semibold">{r.name}</p>
            <p className="text-xs text-muted">{r.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', render: (r) => r.role },
    { key: 'mobile', header: 'Mobile', render: (r) => r.mobile },
    {
      key: 'status',
      header: 'Access',
      render: (r) => (
        <Badge variant={r.active ? 'success' : 'danger'}>{r.active ? 'Active' : 'Disabled'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex gap-2">
          <Link to={`/lawyer/staff/${r.id}`}>
            <Button size="sm" variant="outline">
              Details
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              setList((prev) => prev.map((s) => (s.id === r.id ? { ...s, active: !s.active } : s)))
            }
          >
            {r.active ? 'Disable' : 'Enable'}
          </Button>
        </div>
      ),
    },
  ]

  const onAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') || '')
    const newStaff: Staff = {
      id: `stf-${Date.now()}`,
      lawyerId: user!.id,
      name,
      email: String(fd.get('email') || ''),
      mobile: String(fd.get('mobile') || ''),
      role: (String(fd.get('role') || 'Legal Assistant') as Staff['role']),
      active: true,
      photo: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=1a6b75`,
      permissions: {
        viewCases: true,
        editCases: false,
        addCase: false,
        viewHearingDates: true,
        editHearingDates: false,
        manageDocuments: false,
        addNotes: true,
        manageTasks: false,
      },
    }
    setList((prev) => [newStaff, ...prev])
    setOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Staff Management</h1>
          <p className="text-sm text-muted">স্টাফ অ্যাড, পারমিশন ও অ্যাক্সেস নিয়ন্ত্রণ</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add Staff</Button>
      </div>

      <DataTable columns={columns} data={list} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Staff"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-staff-form">
              Save
            </Button>
          </>
        }
      >
        <form id="add-staff-form" onSubmit={onAdd} className="space-y-3">
          <Input name="name" label="Staff Name" required />
          <Input name="email" label="Email" type="email" required />
          <Input name="mobile" label="Mobile" required />
          <Select
            name="role"
            label="Role"
            options={[
              { value: 'Case Manager', label: 'Case Manager' },
              { value: 'Legal Assistant', label: 'Legal Assistant' },
              { value: 'Office Assistant', label: 'Office Assistant' },
            ]}
          />
          <div>
            <p className="mb-2 text-sm font-medium">Default Permissions</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted">
              {permissionLabels.map((p) => (
                <label key={p.key} className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked={['viewCases', 'viewHearingDates', 'addNotes'].includes(p.key)} />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
