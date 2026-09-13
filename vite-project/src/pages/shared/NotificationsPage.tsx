import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { notifications as all } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user)
  const items = useMemo(
    () =>
      all
        .filter((n) => n.userId === user?.id)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [user],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted">শুনানি, টাস্ক, কেস আপডেট ও রিমাইন্ডার</p>
      </div>

      <ul className="space-y-3">
        {items.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center text-muted">
            কোনো নোটিফিকেশন নেই।
          </li>
        )}
        {items.map((n) => (
          <li key={n.id}>
            <Link
              to={n.link || '#'}
              className={cn(
                'block rounded-xl border border-border bg-white p-4 shadow-sm transition hover:border-teal/40',
                !n.read && 'ring-1 ring-teal/20',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-ink">{n.title}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="teal">{n.type}</Badge>
                  {!n.read && <Badge variant="warning">New</Badge>}
                </div>
              </div>
              <p className="mt-1 text-sm text-muted">{n.message}</p>
              <p className="mt-2 text-xs text-muted">{formatDateTime(n.createdAt)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
