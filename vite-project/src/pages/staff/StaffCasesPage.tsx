import { cases } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { CaseCard } from '@/components/cases/CaseCard'
import { getStaffById } from '@/data/mock'

export default function StaffCasesPage() {
  const user = useAuthStore((s) => s.user)
  const staff = getStaffById(user?.id)
  const assigned = cases.filter((c) => c.assignedStaffIds.includes(user?.id || ''))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">My Assigned Cases</h1>
        <p className="text-sm text-muted">
          শুধুমাত্র আপনার Lawyer-এর অধীনে অ্যাসাইন করা মামলা
          {staff && !staff.permissions.editCases && ' · View only'}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {assigned.map((c) => (
          <CaseCard key={c.id} caseItem={c} basePath="/staff/cases" />
        ))}
        {assigned.length === 0 && (
          <p className="text-muted col-span-full rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center">
            কোনো অ্যাসাইন করা মামলা নেই।
          </p>
        )}
      </div>
    </div>
  )
}
