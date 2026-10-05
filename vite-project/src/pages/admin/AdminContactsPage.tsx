import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'

type Contact = {
  id: string
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
  createdAt?: string
}

export default function AdminContactsPage() {
  const [rows, setRows] = useState<Contact[]>([])
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const res = await api<{ data: Contact[] }>('/admin/contacts')
      setRows(res.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'লোড ব্যর্থ')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const remove = async (id: string) => {
    if (!confirm('মেসেজ ডিলিট করবেন?')) return
    try {
      await api(`/admin/contacts/${id}`, { method: 'DELETE' })
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'ডিলিট ব্যর্থ')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">কন্টাক্ট ইনবক্স</h1>
        <p className="mt-1 text-sm text-muted">পাবলিক Contact ফর্ম থেকে আসা মেসেজ — মোট {rows.length}।</p>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{row.subject || 'বিষয়হীন'}</p>
                <p className="mt-1 text-sm text-muted">
                  {row.name || 'অজানা'} · {row.email || '—'} · {row.phone || '—'}
                </p>
                {row.createdAt && (
                  <p className="mt-0.5 text-xs text-muted">{new Date(row.createdAt).toLocaleString('bn-BD')}</p>
                )}
              </div>
              <Button size="sm" variant="danger" onClick={() => void remove(row.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{row.message || '—'}</p>
          </article>
        ))}
        {rows.length === 0 && !error && (
          <p className="rounded-2xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted">
            এখনো কোনো মেসেজ নেই
          </p>
        )}
      </div>
    </div>
  )
}
