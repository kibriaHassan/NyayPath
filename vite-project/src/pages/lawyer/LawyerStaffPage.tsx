import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { findStaffByQuery, staffMembers } from '@/data/mock'
import { api, ApiError } from '@/lib/api'
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

const defaultPerms = (): StaffPermissions => ({
  viewCases: true,
  editCases: false,
  addCase: false,
  viewHearingDates: true,
  editHearingDates: false,
  manageDocuments: false,
  addNotes: true,
  manageTasks: false,
})

export default function LawyerStaffPage() {
  const user = useAuthStore((s) => s.user)
  const [list, setList] = useState<Staff[]>(() =>
    staffMembers.filter((s) => s.lawyerId === user?.id),
  )
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [role, setRole] = useState<Staff['role']>('Legal Assistant')
  const [perms, setPerms] = useState<StaffPermissions>(defaultPerms)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [preview, setPreview] = useState<{
    name: string
    staffCode: string
    email: string
    mobile: string
  } | null>(null)

  const load = () => {
    api<{ data: Staff[] }>('/staff')
      .then((res) => setList(res.data || []))
      .catch(() => setList(staffMembers.filter((s) => s.lawyerId === user?.id)))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const toggleAccess = async (r: Staff) => {
    setBusyId(r.id)
    try {
      const res = await api<{ data: Staff }>(`/staff/${r.id}/access`, {
        method: 'PATCH',
        body: { active: !r.active },
      })
      setList((prev) => prev.map((s) => (s.id === r.id ? { ...s, active: res.data.active } : s)))
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'স্ট্যাটাস পরিবর্তন হয়নি')
    } finally {
      setBusyId('')
    }
  }

  const removeStaff = async (r: Staff) => {
    if (
      !confirm(
        `"${r.name}"-কে টিম থেকে ডিলিট করবেন?\nতার অ্যাসাইন মামলা আপনার কাছে ফিরে আসবে — আপনি নিজে পরিচালনা করবেন।`,
      )
    )
      return
    setBusyId(r.id)
    try {
      await api(`/staff/${r.id}`, { method: 'DELETE' })
      setList((prev) => prev.filter((s) => s.id !== r.id))
      const local = staffMembers.find((s) => s.id === r.id)
      if (local) {
        local.lawyerId = ''
        local.active = false
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'ডিলিট ব্যর্থ')
    } finally {
      setBusyId('')
    }
  }

  const columns: Column<Staff>[] = [
    {
      key: 'name',
      header: 'Staff',
      render: (r) => (
        <div className="flex items-center gap-3">
          <img src={r.photo} alt="" className="h-9 w-9 rounded-full" />
          <div>
            <p className="font-semibold">
              {r.name}{' '}
              <span className="font-mono text-xs font-semibold text-teal">{r.staffCode}</span>
            </p>
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
        <div className="flex flex-wrap gap-2">
          <Link to={`/lawyer/staff/${r.id}`}>
            <Button size="sm" variant="outline">
              Details / Edit
            </Button>
          </Link>
          <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => void toggleAccess(r)}>
            {r.active ? 'Disable' : 'Enable'}
          </Button>
          <Button size="sm" variant="danger" disabled={busyId === r.id} onClick={() => void removeStaff(r)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  const lookupPreview = async () => {
    setError('')
    setPreview(null)
    if (!query.trim()) {
      setError('Staff ID, ইমেইল বা মোবাইল নম্বর লিখুন।')
      return
    }
    try {
      const res = await api<{
        data: {
          name: string
          staffCode: string
          email: string
          mobile: string
          linkedToYou?: boolean
          linked?: boolean
        }
      }>(`/staff/lookup?q=${encodeURIComponent(query.trim())}`)
      if (res.data.linked && !res.data.linkedToYou) {
        setError('এই Staff ইতিমধ্যে অন্য উকিলের অধীনে আছেন।')
        return
      }
      setPreview({
        name: res.data.name,
        staffCode: res.data.staffCode,
        email: res.data.email,
        mobile: res.data.mobile,
      })
    } catch {
      const local = findStaffByQuery(query)
      if (!local) {
        setError('এই ID / ইমেইল / নাম্বারে কোনো Staff পাওয়া যায়নি।')
        return
      }
      if (local.lawyerId && local.lawyerId !== user?.id) {
        setError('এই Staff ইতিমধ্যে অন্য উকিলের অধীনে আছেন।')
        return
      }
      setPreview({
        name: local.name,
        staffCode: local.staffCode,
        email: local.email,
        mobile: local.mobile,
      })
    }
  }

  const onAdd = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (!query.trim()) {
      setError('Staff ID, ইমেইল বা মোবাইল নম্বর লিখুন।')
      return
    }
    setLoading(true)
    try {
      const res = await api<{ data: Staff }>('/staff/link', {
        method: 'POST',
        body: { query: query.trim(), role, permissions: perms },
      })
      setList((prev) => {
        const rest = prev.filter((s) => s.id !== res.data.id)
        return [res.data, ...rest]
      })
      setOpen(false)
      setQuery('')
      setPreview(null)
      setPerms(defaultPerms())
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status >= 500 || err.message.includes('fetch')) {
          /* fall through */
        } else {
          setError(err.message)
          setLoading(false)
          return
        }
      }
      const local = findStaffByQuery(query)
      if (!local) {
        setError('এই ID / ইমেইল / নাম্বারে কোনো Staff পাওয়া যায়নি।')
        setLoading(false)
        return
      }
      if (local.lawyerId && local.lawyerId !== user?.id) {
        setError('এই Staff ইতিমধ্যে অন্য উকিলের অধীনে আছেন।')
        setLoading(false)
        return
      }
      const wasUnlinked = !local.lawyerId
      local.lawyerId = user!.id
      local.role = role
      local.permissions = { ...perms }
      if (wasUnlinked) local.active = true
      setList((prev) => {
        const rest = prev.filter((s) => s.id !== local.id)
        return [local, ...rest]
      })
      setOpen(false)
      setQuery('')
      setPreview(null)
      setPerms(defaultPerms())
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Staff Management</h1>
          <p className="text-sm text-muted">
            Disable = অ্যাক্সেস বন্ধ · Delete = মামলা আপনার কাছে ফিরে আসবে
          </p>
        </div>
        <Button
          onClick={() => {
            setOpen(true)
            setError('')
            setPreview(null)
            setQuery('')
            setPerms(defaultPerms())
          }}
        >
          Add Staff
        </Button>
      </div>

      {list.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-white px-4 py-6 text-sm text-muted">
          এখনো কোনো Staff নেই — আপনি নিজেই মামলা অ্যাড ও পরিচালনা করতে পারবেন। Staff থাকলে ID দিয়ে যোগ
          করুন।
        </div>
      )}

      <DataTable columns={columns} data={list} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Staff যোগ করুন"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-staff-form" disabled={loading}>
              {loading ? 'যোগ হচ্ছে...' : 'Save'}
            </Button>
          </>
        }
      >
        <form id="add-staff-form" onSubmit={onAdd} className="space-y-3">
          <p className="text-sm text-muted">
            Staff আগে নিজে অ্যাকাউন্ট খুলবেন। তারপর তাদের ইউনিক ID, ইমেইল বা মোবাইল দিয়ে যোগ করুন।
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Staff ID / ইমেইল / মোবাইল"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="যেমন: NP-STF001 বা mahmud@..."
                required
              />
            </div>
            <Button type="button" variant="outline" onClick={lookupPreview}>
              খুঁজুন
            </Button>
          </div>
          {preview && (
            <div className="rounded-lg border border-teal/30 bg-teal/5 px-3 py-2 text-sm">
              <p className="font-semibold text-ink">
                {preview.name}{' '}
                <span className="font-mono text-teal">{preview.staffCode}</span>
              </p>
              <p className="text-muted">
                {preview.email} · {preview.mobile}
              </p>
            </div>
          )}
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as Staff['role'])}
            options={[
              { value: 'Case Manager', label: 'Case Manager' },
              { value: 'Legal Assistant', label: 'Legal Assistant' },
              { value: 'Office Assistant', label: 'Office Assistant' },
            ]}
          />
          <div>
            <p className="mb-2 text-sm font-medium">Default Permissions</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {permissionLabels.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-ink">
                  <input
                    type="checkbox"
                    checked={perms[p.key]}
                    onChange={(e) => setPerms((prev) => ({ ...prev, [p.key]: e.target.checked }))}
                  />
                  {p.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">পরে Details পেজ থেকেও পারমিশন এডিট করা যাবে।</p>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      </Modal>
    </div>
  )
}
