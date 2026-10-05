import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'

interface PremiumMetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  tone?: 'ink' | 'teal' | 'bronze' | 'warning' | 'info' | 'success' | 'danger'
  hint?: string
  delta?: string
  deltaUp?: boolean
}

const tones = {
  ink: 'bg-ink/8 text-ink',
  teal: 'bg-teal/10 text-teal',
  bronze: 'bg-bronze/10 text-bronze',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
}

export function PremiumMetricCard({
  title,
  value,
  icon: Icon,
  tone = 'teal',
  hint,
  delta,
  deltaUp = true,
}: PremiumMetricCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] transition hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_28px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">{value}</p>
          {(delta || hint) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {delta && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-semibold',
                    deltaUp ? 'text-success' : 'text-danger',
                  )}
                >
                  {deltaUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {delta}
                </span>
              )}
              {hint && <span className="text-xs text-muted">{hint}</span>}
            </div>
          )}
        </div>
        <div className={cn('rounded-xl p-3', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
