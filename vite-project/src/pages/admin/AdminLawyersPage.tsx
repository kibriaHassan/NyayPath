import { useEffect, useState } from 'react'
import { Trash2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type AdminLawyer = {
  id: string
  fullName: string
  email: string
  mobile: string
  district: string
  division?: string
  court: string
  practiceType: string
  barAssociation: string
  enrollmentNumber: string
  yearsOfExperience: number
  verified: boolean
  publicProfileEnabled: boolean
  photo: string
  caseCount: number
  staffCount: number
}

export default function AdminLawyersPage() {
  const [rows, setRows] = useState<AdminLawyer[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = async (query = q) => {
    setLoading(true)
    setError('')
    try {
      const res = await api<{ data: AdminLawyer[] }>(`/admin/lawyers${query ? `?q=${encodeURIComponent(query)}` : ''}`)
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

  const patch = async (id: string, body: Record<string, boolean>) => {
    setBusyId(id)
    try {
      await api(`/admin/lawyers/${id}`, { method: 'PATCH', body })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'আপডেট ব্যর্থ')
    } finally {
      setBusyId('')
    }
  }

  const remove = async (row: AdminLawyer) => {
    if (!confirm(`"${row.fullName}" ডিলিট করবেন? সম্পর্কিত মালিকানাহীন মামলাও মুছে যাবে।`)) return
    setBusyId(row.id)
    try {
      await api(`/admin/lawyers/${row.id}`, { method: 'DELETE' })
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
          <h1 className="font-display text-2xl font-semibold">উকিল ম্যানেজমেন্ট</h1>
          <p className="mt-1 text-sm text-muted">মোট {rows.length} জন — verify, visibility ও ডিলিট।</p>
        </div>
        <form
          className="flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void load(q)
          }}
        >
          <Input
            placeholder="নাম, ইমেইল, মোবাইল, জেলা…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
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
                <th className="px-4 py-3 font-semibold">উকিল</th>
                <th className="px-4 py-3 font-semibold">যোগাযোগ</th>
                <th className="px-4 py-3 font-semibold">লোকেশন</th>
                <th className="px-4 py-3 font-semibold">স্ট্যাটস</th>
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
                        <p className="font-semibold text-ink">{row.fullName}</p>
                        <p className="text-xs text-muted">
                          {row.practiceType} · {row.caseCount} মামলা · {row.staffCount} staff
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p>{row.email}</p>
                    <p className="text-xs text-muted">{row.mobile}</p>
                    <p className="text-xs text-muted">{row.enrollmentNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{row.district}</p>
                    <p className="text-xs text-muted">{row.court}</p>
                  </td>
                  <td className="px-4 py-3 space-y-1">
                    {row.verified ? <Badge variant="success">Verified</Badge> : <Badge>Unverified</Badge>}
                    {row.publicProfileEnabled ? (
                      <Badge variant="info">Public</Badge>
                    ) : (
                      <Badge variant="warning">Hidden</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => void patch(row.id, { verified: !row.verified })}
                        title="Verify toggle"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === row.id}
                        onClick={() => void patch(row.id, { publicProfileEnabled: !row.publicProfileEnabled })}
                        title="Public visibility"
                      >
                        {row.publicProfileEnabled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    কোনো উকিল পাওয়া যায়নি
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
