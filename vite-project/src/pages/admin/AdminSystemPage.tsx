import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'

type Overview = {
  mongo: boolean
  message?: string
  database?: string
  collections:
    | Record<string, number>
    | { name: string; label: string; count: number }[]
    | null
}

export default function AdminSystemPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const res = await api<{ data: Overview }>('/admin/db-overview')
    setData(res.data)
  }

  useEffect(() => {
    void load().catch((e) => setMsg(e instanceof Error ? e.message : 'লোড ব্যর্থ'))
  }, [])

  const reseed = async () => {
    if (!confirm('ডেমো ডেটা দিয়ে পুরো ডাটাবেস রিসেট হবে। নিশ্চিত?')) return
    setBusy(true)
    setMsg('')
    try {
      const res = await api<{ ok: boolean; message: string }>('/admin/reseed', { method: 'POST' })
      setMsg(res.message || 'Reseed সম্পন্ন')
      await load()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Reseed ব্যর্থ')
    } finally {
      setBusy(false)
    }
  }

  const collections = data?.collections
  const list = Array.isArray(collections)
    ? collections
    : collections
      ? Object.entries(collections).map(([name, count]) => ({ name, label: name, count }))
      : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">সিস্টেম / ডাটাবেস</h1>
        <p className="mt-1 text-sm text-muted">কালেকশন স্বাস্থ্য, Mongo স্ট্যাটাস ও ডেমো রিসিড।</p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5">
        <p className="text-sm">
          <span className="font-semibold">স্টোরেজ:</span>{' '}
          {data?.mongo ? `MongoDB (${data.database || 'nyaypath'})` : data?.message || 'Local JSON'}
        </p>
        {msg && <p className="mt-2 text-sm text-teal">{msg}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void load()}>
            রিফ্রেশ
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void reseed()}>
            {busy ? 'রিসেট হচ্ছে…' : 'Demo Data Reseed'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Reseed শুধু ডেমো/ডেভেলপমেন্টে ব্যবহার করুন — প্রোডাকশন ডেটা মুছে যাবে।
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <div key={c.name} className="rounded-2xl border border-border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{c.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink">{c.count}</p>
            <p className="text-xs text-muted">{c.name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
