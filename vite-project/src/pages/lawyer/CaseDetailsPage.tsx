import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  documents as mockDocuments,
  getCaseById,
  getLawyerById,
  getStaffById,
  hearings as mockHearings,
  tasks as mockTasks,
  staffMembers,
} from '@/data/mock'
import { api, ApiError } from '@/lib/api'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Case, CaseDocument, Hearing, Staff, Task } from '@/types'

export default function CaseDetailsPage({ basePath = '/lawyer' }: { basePath?: string }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [caseItem, setCaseItem] = useState<Case | null>(() => getCaseById(id) || null)
  const [staffList, setStaffList] = useState<Staff[]>(() =>
    staffMembers.filter((s) => s.lawyerId === user?.id || (id && getCaseById(id)?.assignedStaffIds?.includes(s.id))),
  )
  const [caseDocs, setCaseDocs] = useState<CaseDocument[]>(() =>
    mockDocuments.filter((d) => d.caseId === id),
  )
  const [caseHearings, setCaseHearings] = useState<Hearing[]>(() =>
    mockHearings.filter((h) => h.caseId === id),
  )
  const [caseTasks, setCaseTasks] = useState<Task[]>(() => mockTasks.filter((t) => t.caseId === id))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const isLawyer = user?.role === 'LAWYER'
  const canSeePrivate = isLawyer || user?.role === 'STAFF'
  const iAmOnCase =
    !!user &&
    (caseItem?.plaintiffLawyerId === user.id || caseItem?.defendantLawyerId === user.id)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError('মামলা পাওয়া যায়নি।')
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')

    Promise.all([
      api<{ data: Case }>(`/cases/${id}`),
      api<{ data: Staff[] }>('/staff').catch(() => ({ data: staffMembers })),
      api<{ data: Hearing[] }>('/hearings').catch(() => ({ data: mockHearings })),
      api<{ data: CaseDocument[] }>('/documents').catch(() => ({ data: mockDocuments })),
      api<{ data: Task[] }>('/tasks').catch(() => ({ data: mockTasks })),
    ])
      .then(([caseRes, staffRes, hearingRes, docRes, taskRes]) => {
        if (cancelled) return
        setCaseItem(caseRes.data)
        setStaffList(staffRes.data || [])
        setCaseHearings((hearingRes.data || []).filter((h) => h.caseId === id))
        setCaseDocs((docRes.data || []).filter((d) => d.caseId === id))
        setCaseTasks((taskRes.data || []).filter((t) => t.caseId === id))
      })
      .catch(() => {
        if (cancelled) return
        const local = getCaseById(id)
        if (local) {
          setCaseItem(local)
          setStaffList(staffMembers)
          setCaseHearings(mockHearings.filter((h) => h.caseId === id))
          setCaseDocs(mockDocuments.filter((d) => d.caseId === id))
          setCaseTasks(mockTasks.filter((t) => t.caseId === id))
        } else {
          setCaseItem(null)
          setError('মামলা পাওয়া যায়নি।')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, user?.id])

  if (loading) {
    return <p className="text-muted">মামলা লোড হচ্ছে…</p>
  }

  if (!caseItem) {
    return (
      <div className="space-y-3">
        <p className="text-muted">{error || 'মামলা পাওয়া যায়নি।'}</p>
        <Link to={`${basePath}/cases`} className="text-sm font-semibold text-teal hover:underline">
          মামলার তালিকায় ফিরে যান
        </Link>
      </div>
    )
  }

  const assignedIds = caseItem.assignedStaffIds || []
  const owner = getLawyerById(caseItem.ownerLawyerId)

  const resolveStaff = (sid: string) =>
    staffList.find((s) => s.id === sid) || getStaffById(sid)

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
          <div className="flex flex-wrap gap-2">
            <Link to={`${basePath}/cases/${caseItem.id}/edit`}>
              <Button variant="outline">Edit Case</Button>
            </Link>
            {iAmOnCase && (
              <Button
                variant="outline"
                disabled={withdrawing}
                onClick={async () => {
                  if (
                    !confirm(
                      'আপনি এই মামলা পরিচালনা বন্ধ করতে চান? আপনার নাম এই পক্ষ থেকে কেটে যাবে — অন্য উকিল পরে যোগ করতে পারবেন।',
                    )
                  ) {
                    return
                  }
                  setWithdrawing(true)
                  setActionMsg('')
                  try {
                    const res = await api<{ data: Case; message?: string }>(
                      `/cases/${caseItem.id}/withdraw`,
                      { method: 'POST', body: {} },
                    )
                    setCaseItem(res.data)
                    setActionMsg(res.message || 'আপনি মামলা থেকে সরে গেছেন।')
                    setTimeout(() => navigate(`${basePath}/cases`), 1000)
                  } catch (err) {
                    setActionMsg(err instanceof ApiError ? err.message : 'কাজটি ব্যর্থ হয়েছে।')
                  }
                  setWithdrawing(false)
                }}
              >
                {withdrawing ? 'সরানো হচ্ছে…' : 'পরিচালনা বন্ধ / Closed'}
              </Button>
            )}
          </div>
        )}
      </div>
      {actionMsg && <p className="text-sm text-teal">{actionMsg}</p>}

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
                ['Judge', caseItem.judgeName || '—'],
                ['Owner Lawyer', owner?.fullName || user?.name || '—'],
                ['বাদী', caseItem.plaintiff],
                ['বিবাদী', caseItem.defendant],
                [
                  'বাদীপক্ষের উকিল',
                  caseItem.plaintiffLawyerName ||
                    (caseItem.plaintiffLawyerId ? getLawyerById(caseItem.plaintiffLawyerId)?.fullName : '') ||
                    '— (এখনো নেই)',
                ],
                [
                  'বিবাদীপক্ষের উকিল',
                  caseItem.defendantLawyerName ||
                    (caseItem.defendantLawyerId ? getLawyerById(caseItem.defendantLawyerId)?.fullName : '') ||
                    '— (এখনো নেই)',
                ],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <p className="text-sm text-muted">Description</p>
              <p className="mt-1 text-sm leading-relaxed">{caseItem.description || '—'}</p>
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted">Important Notes</p>
              <p className="mt-1 text-sm">{caseItem.importantNotes || '—'}</p>
            </div>
            {canSeePrivate && (
              <div className="mt-4 rounded-lg border border-danger/20 bg-danger/5 p-3">
                <p className="text-xs font-semibold uppercase text-danger">Private Notes (authorized only)</p>
                <p className="mt-1 text-sm">{caseItem.privateNotes || '—'}</p>
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
              {assignedIds.length === 0 && (
                <p className="text-sm text-muted">স্টাফ অ্যাসাইন নেই — উকিল নিজে পরিচালনা করছেন।</p>
              )}
              {assignedIds.map((sid) => {
                const s = resolveStaff(sid)
                if (!s) {
                  return (
                    <p key={sid} className="text-sm text-muted">
                      Staff ID: {sid}
                    </p>
                  )
                }
                return (
                  <div key={sid} className="flex items-center gap-3">
                    <img src={s.photo} alt="" className="h-9 w-9 rounded-full" />
                    <div>
                      <p className="text-sm font-semibold">
                        {s.name}{' '}
                        {s.staffCode && (
                          <span className="font-mono text-xs text-teal">{s.staffCode}</span>
                        )}
                      </p>
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
              {caseHearings.length === 0 && caseItem.nextHearingDate && (
                <div className="rounded-lg bg-slate-panel p-3 text-sm">
                  <p className="font-semibold">{formatDate(caseItem.nextHearingDate)}</p>
                  <p className="text-muted">পরবর্তী শুনানি</p>
                </div>
              )}
              {caseHearings.length === 0 && !caseItem.nextHearingDate && (
                <p className="text-sm text-muted">কোনো শুনানি নেই।</p>
              )}
              {caseHearings.map((h) => (
                <div key={h.id} className="rounded-lg bg-slate-panel p-3 text-sm">
                  <p className="font-semibold">
                    {formatDate(h.hearingDate)} · {h.hearingTime}
                  </p>
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
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
              >
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
