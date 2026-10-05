import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

type AdminCase = {
  id: string
  caseNumber: string
  title: string
  caseType: string
  status: string
  division?: string
  district?: string
  courtName?: string
  plaintiff?: string
  defendant?: string
  plaintiffLawyerName?: string
  defendantLawyerName?: string
  nextHearingDate?: string
  filingDate?: string
}

export default function AdminCasesPage() {
  const [rows, setRows] = useState<AdminCase[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  const load = async (query = q) => {
    setLoading(true)
    setError('')
    try {
      const res = await api<{ data: AdminCase[] }>(`/admin/cases${query ? `?q=${encodeURIComponent(query)}` : ''}`)
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

  const remove = async (row: AdminCase) => {
    if (
      !confirm(
        `মামলা ${row.caseNumber} ডিলিট করবেন?\nশুনানি, টাস্ক ও ডকুমেন্টও ডাটাবেস থেকে মুছে যাবে।`,
      )
    )
      return
    setBusyId(row.id)
    try {
      await api(`/admin/cases/${row.id}`, { method: 'DELETE' })
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
          <h1 className="font-display text-2xl font-semibold">মামলা ম্যানেজমেন্ট</h1>
          <p className="mt-1 text-sm text-muted">মোট {rows.length} টি — ডাটাবেস থেকে স্থায়ী ডিলিট।</p>
        </div>
        <form
          className="flex w-full max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void load(q)
          }}
        >
          <Input placeholder="মামলা নম্বর, পক্ষ, আদালত…" value={q} onChange={(e) => setQ(e.target.value)} />
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
                <th className="px-4 py-3 font-semibold">মামলা</th>
                <th className="px-4 py-3 font-semibold">পক্ষ / উকিল</th>
                <th className="px-4 py-3 font-semibold">আদালত</th>
                <th className="px-4 py-3 font-semibold">স্ট্যাটাস</th>
                <th className="px-4 py-3 font-semibold">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{row.caseNumber}</p>
                    <p className="text-xs text-muted">{row.title}</p>
                    <p className="text-xs text-muted">{row.caseType}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>
                      <span className="text-muted">বাদী:</span> {row.plaintiff || '—'}
                    </p>
                    <p>
                      <span className="text-muted">বিবাদী:</span> {row.defendant || '—'}
                    </p>
                    <p className="text-xs text-muted">
                      {row.plaintiffLawyerName || '—'} / {row.defendantLawyerName || '—'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{row.courtName || '—'}</p>
                    <p className="text-xs text-muted">
                      {[row.division, row.district].filter(Boolean).join(' · ')}
                    </p>
                    {row.nextHearingDate && (
                      <p className="text-xs text-teal">Next: {row.nextHearingDate}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{row.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={busyId === row.id}
                      onClick={() => void remove(row)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    কোনো মামলা পাওয়া যায়নি
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
