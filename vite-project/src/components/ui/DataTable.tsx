import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  className?: string
  mobileLabel?: string
  hideOnMobile?: boolean
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string | undefined
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  emptyMessage = 'কোনো তথ্য পাওয়া যায়নি।',
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-slate-panel px-4 py-12 text-center text-sm text-muted">
        {emptyMessage}
      </div>
    )
  }

  const mobileColumns = columns.filter((c) => !c.hideOnMobile)

  return (
    <>
      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {data.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onRowClick?.(row)}
            className={cn(
              'w-full rounded-xl border border-border bg-white p-4 text-left shadow-sm',
              onRowClick && 'active:bg-mist/60',
              rowClassName?.(row),
            )}
          >
            <dl className="space-y-2.5">
              {mobileColumns.map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
                  <dt className="shrink-0 text-muted">{col.mobileLabel || col.header}</dt>
                  <dd className="min-w-0 text-right font-medium text-ink">{col.render(row)}</dd>
                </div>
              ))}
            </dl>
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-white md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-panel text-muted">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn('px-4 py-3 font-semibold', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-t border-border transition',
                  onRowClick && 'cursor-pointer hover:bg-mist/60',
                  rowClassName?.(row),
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-ink', col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
