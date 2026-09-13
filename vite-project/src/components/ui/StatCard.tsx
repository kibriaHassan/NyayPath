import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  tone?: 'ink' | 'teal' | 'bronze' | 'warning' | 'info'
  hint?: string
}

const tones = {
  ink: 'bg-ink/8 text-ink',
  teal: 'bg-teal/10 text-teal',
  bronze: 'bg-bronze/10 text-bronze',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
}

export function StatCard({ title, value, icon: Icon, tone = 'teal', hint }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{title}</p>
          <p className="mt-1 font-display text-3xl font-semibold text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <div className={cn('rounded-lg p-2.5', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
