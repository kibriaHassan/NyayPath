import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { cases, staffMembers } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { CaseTable } from '@/components/cases/CaseTable'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'

export default function LawyerCasesPage() {
  const user = useAuthStore((s) => s.user)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [court, setCourt] = useState('')
  const [type, setType] = useState('')
  const [staff, setStaff] = useState('')

  const myCases = cases.filter((c) => c.ownerLawyerId === user?.id)
  const myStaff = staffMembers.filter((s) => s.lawyerId === user?.id)

  const filtered = useMemo(() => {
    return myCases.filter((c) => {
      if (q && !(`${c.caseNumber} ${c.caseTitle}`.toLowerCase().includes(q.toLowerCase()))) return false
      if (status && c.status !== status) return false
      if (court && !c.courtName.toLowerCase().includes(court.toLowerCase())) return false
      if (type && c.caseType !== type) return false
      if (staff && !c.assignedStaffIds.includes(staff)) return false
      return true
    })
  }, [myCases, q, status, court, type, staff])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">My Cases</h1>
          <p className="text-sm text-muted">{filtered.length} টি মামলা</p>
        </div>
        <Link to="/lawyer/cases/new">
          <Button>Add New Case</Button>
        </Link>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <Input label="Search" placeholder="নম্বর / শিরোনাম" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="সব"
          options={['Active', 'Pending', 'Hearing Scheduled', 'Disposed', 'Closed'].map((v) => ({
            value: v,
            label: v,
          }))}
        />
        <Input label="Court" value={court} onChange={(e) => setCourt(e.target.value)} placeholder="আদালত" />
        <Select
          label="Case Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="সব"
          options={[...new Set(myCases.map((c) => c.caseType))].map((v) => ({ value: v, label: v }))}
        />
        <Select
          label="Assigned Staff"
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          placeholder="সব"
          options={myStaff.map((s) => ({ value: s.id, label: s.name }))}
        />
      </div>

      <CaseTable cases={filtered} />
    </div>
  )
}
