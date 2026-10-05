import { useNavigate } from 'react-router-dom'
import type { Case } from '@/types'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { formatDate, isToday, isUpcoming } from '@/lib/utils'
import { getStaffById } from '@/data/mock'
import { cn } from '@/lib/utils'

export function CaseTable({
  cases,
  basePath = '/lawyer/cases',
  showStaff = true,
}: {
  cases: Case[]
  basePath?: string
  showStaff?: boolean
}) {
  const navigate = useNavigate()

  const columns: Column<Case>[] = [
    {
      key: 'number',
      header: 'Case Number',
      render: (row) => <span className="font-semibold text-teal">{row.caseNumber}</span>,
    },
    {
      key: 'title',
      header: 'Case Title',
      render: (row) => row.caseTitle,
    },
    {
      key: 'court',
      header: 'Court',
      render: (row) => row.courtName,
    },
    {
      key: 'next',
      header: 'Next Date',
      render: (row) => {
        const hot = isToday(row.nextHearingDate) || isUpcoming(row.nextHearingDate, 7)
        return (
          <span className={cn('font-medium', hot && 'text-warning')}>
            {formatDate(row.nextHearingDate)}
            {isToday(row.nextHearingDate) && (
              <Badge variant="warning" className="ml-2">
                আজ
              </Badge>
            )}
          </span>
        )
      },
    },
    ...(showStaff
      ? [
          {
            key: 'staff',
            header: 'Responsible Staff',
            render: (row: Case) => {
              const ids = row.assignedStaffIds || []
              if (ids.length === 0) return 'নিজে পরিচালনা'
              return (
                ids
                  .map((id) => getStaffById(id)?.name)
                  .filter(Boolean)
                  .join(', ') || 'নিজে পরিচালনা'
              )
            },
          } as Column<Case>,
        ]
      : []),
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>,
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={cases}
      onRowClick={(row) => navigate(`${basePath}/${row.id}`)}
      rowClassName={(row) =>
        isToday(row.nextHearingDate) || isUpcoming(row.nextHearingDate, 3)
          ? 'bg-warning/5'
          : undefined
      }
    />
  )
}
