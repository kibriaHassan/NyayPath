import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'teal' | 'muted'

const styles: Record<BadgeVariant, string> = {
  default: 'bg-ink/10 text-ink',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  teal: 'bg-teal/10 text-teal',
  muted: 'bg-mist text-muted',
}

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'Active':
    case 'Completed':
      return 'success'
    case 'Hearing Scheduled':
    case 'In Progress':
      return 'info'
    case 'Pending':
      return 'warning'
    case 'Disposed':
    case 'Closed':
      return 'muted'
    case 'Urgent':
    case 'High':
      return 'danger'
    default:
      return 'default'
  }
}
