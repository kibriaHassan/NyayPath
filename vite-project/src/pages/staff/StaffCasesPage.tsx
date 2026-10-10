import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CaseCard } from '@/components/cases/CaseCard'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/api'
import { sortByNextHearing } from '@/lib/courtCalendar'
import type { Case, Staff, StaffPermissions } from '@/types'

export default function StaffCasesPage() {
  const [assigned, setAssigned] = useState<Case[]>([])
  const [perms, setPerms] = useState<StaffPermissions | null>(null)

  useEffect(() => {
    api<{ data: Staff }>('/staff/me')
      .then((res) => setPerms(res.data.permissions))
      .catch(() => setPerms(null))
    api<{ data: Case[] }>('/cases')
      .then((res) => setAssigned(sortByNextHearing(res.data || [])))
      .catch(() => setAssigned([]))
  }, [])

  const canView = Boolean(perms?.viewCases || perms?.editCases)
  const canAdd = Boolean(perms?.addCase)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">My Assigned Cases</h1>
          <p className="text-sm text-muted">
            {perms?.editCases
              ? 'অ্যাসাইন করা মামলা দেখা ও এডিট করা যাবে।'
              : 'অ্যাসাইন করা মামলা — এডিটের অনুমতি না থাকলে শুধু দেখা যাবে।'}
          </p>
        </div>
        {canAdd && (
          <Link to="/staff/cases/new">
            <Button>নতুন মামলা</Button>
          </Link>
        )}
      </div>
      {!canView && perms && (
        <p className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center text-muted">
          মামলা দেখার অনুমতি নেই।
        </p>
      )}
      {canView && (
        <div className="grid gap-4 md:grid-cols-2">
          {assigned.map((c) => (
            <CaseCard key={c.id} caseItem={c} basePath="/staff/cases" />
          ))}
          {assigned.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center text-muted">
              কোনো অ্যাসাইন করা মামলা নেই।
            </p>
          )}
        </div>
      )}
    </div>
  )
}
