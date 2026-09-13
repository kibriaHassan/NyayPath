import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { notifications as allNotifications } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function NotificationDropdown({ basePath }: { basePath: string }) {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)

  const items = useMemo(() => {
    if (!user) return []
    return allNotifications
      .filter((n) => n.userId === user.id)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [user])

  const unread = items.filter((n) => !n.read).length

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-ink hover:bg-mist"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-hidden rounded-xl border border-border bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 sm:max-h-none">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h4 className="font-semibold text-ink">নোটিফিকেশন</h4>
              <Link
                to={`${basePath}/notifications`}
                className="text-xs font-semibold text-teal"
                onClick={() => setOpen(false)}
              >
                সব দেখুন
              </Link>
            </div>
            <ul className="max-h-80 overflow-auto">
              {items.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-muted">কোনো নোটিফিকেশন নেই</li>
              )}
              {items.slice(0, 6).map((n) => (
                <li key={n.id}>
                  <Link
                    to={n.link || `${basePath}/notifications`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block border-b border-border px-4 py-3 hover:bg-mist/70',
                      !n.read && 'bg-teal/5',
                    )}
                  >
                    <p className="text-sm font-semibold text-ink">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{n.message}</p>
                    <p className="mt-1 text-[11px] text-muted">{formatDateTime(n.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
