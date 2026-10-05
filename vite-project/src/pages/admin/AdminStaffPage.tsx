import { useEffect, useState } from 'react'
import { Trash2, UserCheck, UserX } from 'lucide-react'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type AdminStaff = {
  id: string
  staffCode: string
  name: string
  email: string
  mobile: string
  role: string
  active: boolean
  photo: string
  lawyerId: string
  lawyerName: string
  caseCount: number
}

export default function AdminStaffPage() {
  const [rows, setRows] = useState<AdminStaff[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = async (query = q) => {
    setLoading(true)
    setError('')
    try {
      const res = await api<{ data: AdminStaff[] }>(`/admin/staff${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      setRows(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'লোড ব্যর্থ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleActive = async (row: AdminStaff) => {
    setBusyId(row.id)
    try {
      await api(`/admin/staff/${row.id}`, { method: 'PATCH', body: { active: !row.active } })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'আপডেট ব্যর্থ')
    } finally {
      setBusyId('')
    }
  }

  const remove = async (row: AdminStaff) => {
    if (!confirm(`"${row.name}" (${row.staffCode}) ডিলিট করবেন?`)) return
    setBusyId(row.id)
    try {
      await api(`/admin/staff/${row.id}`, { method: 'DELETE' })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ডিলিট ব্যর্থ')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Staff ম্যানেজমেন্ট</h1>
          <p className="mt-1 text-sm text-muted">মোট {rows.length} জন — অ্যাকটিভ স্ট্যাটাস ও ডিলিট।</p>
        </div>
        <form
          className="flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void load(q)
          }}
        >
          <Input placeholder="নাম, ID, ইমেইল…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" variant="secondary">
            খুঁজুন
          </Button>
        </form>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted">লোড হচ্ছে…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-mist/60 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Staff</th>
                <th className="px-4 py-3 font-semibold">লিংকড উকিল</th>
                <th className="px-4 py-3 font-semibold">স্ট্যাটাস</th>
                <th className="px-4 py-3 font-semibold">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={row.photo} alt="" className="h-10 w-10 rounded-full border border-border" />
                      <div>
                        <p className="font-semibold text-ink">
                          {row.name}{' '}
                          <span className="font-mono text-xs text-teal">{row.staffCode}</span>
                        </p>
                        <p className="text-xs text-muted">
                          {row.role} · {row.email} · {row.mobile}
                        </p>
                        <p className="text-xs text-muted">{row.caseCount} assigned cases</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.lawyerName ? (
                      <p>{row.lawyerName}</p>
                    ) : (
                      <span className="text-muted">লিংক নেই</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.active ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Inactive</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => void toggleActive(row)}
                      >
                        {row.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        {row.active ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === row.id}
                        onClick={() => void remove(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    কোনো staff পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
