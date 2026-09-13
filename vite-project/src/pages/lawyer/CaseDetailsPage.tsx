import { Link, useParams } from 'react-router-dom'
import { documents, getCaseById, getLawyerById, getStaffById, hearings, tasks } from '@/data/mock'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

export default function CaseDetailsPage({ basePath = '/lawyer' }: { basePath?: string }) {
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const caseItem = getCaseById(id)
  const isLawyer = user?.role === 'LAWYER'
  const canSeePrivate = isLawyer || user?.role === 'STAFF'

  if (!caseItem) {
    return <p className="text-muted">মামলা পাওয়া যায়নি।</p>
  }

  const caseDocs = documents.filter((d) => d.caseId === caseItem.id)
  const caseHearings = hearings.filter((h) => h.caseId === caseItem.id)
  const caseTasks = tasks.filter((t) => t.caseId === caseItem.id)
  const owner = getLawyerById(caseItem.ownerLawyerId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">{caseItem.caseNumber}</p>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">{caseItem.caseTitle}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={statusBadgeVariant(caseItem.status)}>{caseItem.status}</Badge>
            <Badge variant="muted">{caseItem.caseType}</Badge>
          </div>
        </div>
        {isLawyer && (
          <Link to={`${basePath}/cases/${caseItem.id}/edit`}>
            <Button variant="outline">Edit Case</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold">Case Information</h2>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              {[
                ['Court', caseItem.courtName],
                ['Location', caseItem.courtLocation],
                ['Filing Date', formatDate(caseItem.filingDate)],
                ['Next Hearing', formatDate(caseItem.nextHearingDate)],
                ['Judge', caseItem.judgeName],
                ['Owner Lawyer', owner?.fullName || '—'],
                ['Plaintiff', caseItem.plaintiff],
                ['Defendant', caseItem.defendant],
                ['Plaintiff Lawyer', caseItem.plaintiffLawyerName || '—'],
                ['Defendant Lawyer', caseItem.defendantLawyerName || '—'],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <p className="text-sm text-muted">Description</p>
              <p className="mt-1 text-sm leading-relaxed">{caseItem.description}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted">Important Notes</p>
              <p className="mt-1 text-sm">{caseItem.importantNotes || '—'}</p>
            </div>
            {canSeePrivate && (
              <div className="mt-4 rounded-lg border border-danger/20 bg-danger/5 p-3">
                <p className="text-xs font-semibold uppercase text-danger">Private Notes (authorized only)</p>
                <p className="mt-1 text-sm">{caseItem.privateNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Assigned Staff</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {caseItem.assignedStaffIds.length === 0 && (
                <p className="text-sm text-muted">কোনো স্টাফ অ্যাসাইন নেই।</p>
              )}
              {caseItem.assignedStaffIds.map((sid) => {
                const s = getStaffById(sid)
                if (!s) return null
                return (
                  <div key={sid} className="flex items-center gap-3">
                    <img src={s.photo} alt="" className="h-9 w-9 rounded-full" />
                    <div>
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-muted">{s.role}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="font-semibold">Hearings</h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {caseHearings.map((h) => (
                <div key={h.id} className="rounded-lg bg-slate-panel p-3 text-sm">
                  <p className="font-semibold">{formatDate(h.hearingDate)} · {h.hearingTime}</p>
                  <p className="text-muted">{h.hearingType}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Documents</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {caseDocs.length === 0 && <p className="text-sm text-muted">কোনো ডকুমেন্ট নেই।</p>}
            {caseDocs.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-muted">
                    {d.type} · {formatDate(d.uploadDate)} · {d.uploadedBy}
                  </p>
                </div>
                <Badge variant="muted">{d.fileType}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Tasks</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {caseTasks.length === 0 && <p className="text-sm text-muted">কোনো টাস্ক নেই।</p>}
            {caseTasks.map((t) => (
              <div key={t.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{t.title}</p>
                  <Badge variant={statusBadgeVariant(t.status)}>{t.status}</Badge>
                </div>
                <p className="text-xs text-muted">Due: {formatDate(t.dueDate)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
