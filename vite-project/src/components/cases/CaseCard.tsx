import { Link } from 'react-router-dom'
import type { Case } from '@/types'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { formatDate, isToday, isUpcoming } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function CaseCard({
  caseItem,
  basePath = '/lawyer/cases',
}: {
  caseItem: Case
  basePath?: string
}) {
  const highlight = isToday(caseItem.nextHearingDate) || isUpcoming(caseItem.nextHearingDate, 3)

  return (
    <Link
      to={`${basePath}/${caseItem.id}`}
      className={cn(
        'block rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md',
        highlight ? 'border-warning/50 ring-1 ring-warning/20' : 'border-border hover:border-teal/40',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">
            {caseItem.caseNumber}
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold text-ink">{caseItem.caseTitle}</h3>
        </div>
        <Badge variant={statusBadgeVariant(caseItem.status)}>{caseItem.status}</Badge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">আদালত</dt>
          <dd className="font-medium text-ink">{caseItem.courtName}</dd>
        </div>
        <div>
          <dt className="text-muted">পরবর্তী তারিখ</dt>
          <dd className={cn('font-medium', highlight ? 'text-warning' : 'text-ink')}>
            {formatDate(caseItem.nextHearingDate)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">বাদী</dt>
          <dd className="font-medium text-ink">{caseItem.plaintiff}</dd>
        </div>
        <div>
          <dt className="text-muted">বিবাদী</dt>
          <dd className="font-medium text-ink">{caseItem.defendant}</dd>
        </div>
      </dl>
    </Link>
  )
}
