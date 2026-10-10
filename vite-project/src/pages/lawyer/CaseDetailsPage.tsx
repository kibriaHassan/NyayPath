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
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { courtTypeLabel, inferCourtType } from '@/lib/bdLocations'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Case, CaseDocument, Hearing, Staff, StaffPermissions, Task } from '@/types'

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
  const [staffPerms, setStaffPerms] = useState<StaffPermissions | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [hearingDraft, setHearingDraft] = useState('')
  const [purposeDraft, setPurposeDraft] = useState('')
  const [docName, setDocName] = useState('')

  const isLawyer = user?.role === 'LAWYER'
  const canEditCase = isLawyer || Boolean(staffPerms?.editCases)
  const canEditHearing = isLawyer || Boolean(staffPerms?.editHearingDates || staffPerms?.editCases)
  const canAddNotes = !isLawyer && Boolean(staffPerms?.addNotes)
  const canDocs = !isLawyer && Boolean(staffPerms?.manageDocuments)
  const canTasks = !isLawyer && Boolean(staffPerms?.manageTasks)
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
    if (user?.role === 'STAFF') {
      api<{ data: Staff }>('/staff/me')
        .then((res) => {
          if (!cancelled) setStaffPerms(res.data.permissions)
        })
        .catch(() => {})
    }

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

  const courtKind =
    courtTypeLabel(caseItem.courtType) || courtTypeLabel(inferCourtType(caseItem.courtName)) || '—'

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">{caseItem.caseNumber}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink md:text-3xl">{caseItem.caseTitle}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={statusBadgeVariant(caseItem.status)}>{caseItem.status}</Badge>
            <Badge variant="muted">{caseItem.caseType}</Badge>
          </div>
        </div>
        {canEditCase && (
          <div className="flex flex-wrap gap-2">
            <Link to={`${basePath}/cases/${caseItem.id}/edit`}>
              <Button variant="outline">Edit Case</Button>
            </Link>
            {isLawyer && iAmOnCase && (
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
        <div className="space-y-4 lg:col-span-2">
          <Card className="overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-border/70 bg-slate-panel/40">
              <h2 className="font-semibold">আদালত</h2>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <Field label="বিভাগ" value={caseItem.division || '—'} />
                <Field label="জেলা" value={caseItem.district || caseItem.courtLocation || '—'} />
                <Field label="আদালতের ধরন" value={courtKind} />
                <Field label="আদালত" value={caseItem.courtName || '—'} />
                <Field label="বিচারক" value={caseItem.judgeName || '—'} />
                <Field label="মামলার ধরন" value={caseItem.caseType || '—'} />
              </dl>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-border/70 bg-slate-panel/40">
              <h2 className="font-semibold">পক্ষ ও উকিল</h2>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <Field label="বাদী" value={caseItem.plaintiff || '—'} />
                <Field label="বিবাদী" value={caseItem.defendant || '—'} />
                <Field
                  label="বাদীপক্ষের উকিল"
                  value={
                    caseItem.plaintiffLawyerName ||
                    (caseItem.plaintiffLawyerId ? getLawyerById(caseItem.plaintiffLawyerId)?.fullName : '') ||
                    '— (এখনো নেই)'
                  }
                />
                <Field
                  label="বিবাদীপক্ষের উকিল"
                  value={
                    caseItem.defendantLawyerName ||
                    (caseItem.defendantLawyerId ? getLawyerById(caseItem.defendantLawyerId)?.fullName : '') ||
                    '— (এখনো নেই)'
                  }
                />
                <Field label="মালিক উকিল" value={owner?.fullName || user?.name || '—'} />
              </dl>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-border/70 bg-slate-panel/40">
              <h2 className="font-semibold">তারিখ ও নোট</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <Field label="দাখিলের তারিখ" value={formatDate(caseItem.filingDate)} />
                <Field label="পরবর্তী শুনানি" value={formatDate(caseItem.nextHearingDate)} />
                <Field label="সেদিনের কাজ" value={caseItem.nextHearingPurpose || '—'} />
              </dl>
              <Note label="বিবরণ" value={caseItem.description} />
              <Note label="গুরুত্বপূর্ণ নোট" value={caseItem.importantNotes} />
              {canSeePrivate ? (
                <div className="rounded-xl border border-danger/20 bg-danger/5 p-3">
                  <p className="text-xs font-semibold uppercase text-danger">ব্যক্তিগত নোট</p>
                  <p className="mt-1 text-sm text-ink">{caseItem.privateNotes || '—'}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-border/70 bg-slate-panel/40">
              <h2 className="font-semibold">দায়িত্বপ্রাপ্ত স্টাফ</h2>
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

          <Card className="overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-border/70 bg-slate-panel/40">
              <h2 className="font-semibold">শুনানি</h2>
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

      {(canEditHearing || canAddNotes || canDocs) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {canEditHearing && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">পরবর্তী শুনানির তারিখ</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input label="তারিখ" type="date" value={hearingDraft} onChange={(e) => setHearingDraft(e.target.value)} />
                <Input label="সেদিনের কাজ" value={purposeDraft} onChange={(e) => setPurposeDraft(e.target.value)} />
                <Button
                  onClick={async () => {
                    if (!caseItem || !hearingDraft || !purposeDraft.trim()) return
                    try {
                      const res = await api<{ data: Case }>(`/cases/${caseItem.id}/next-hearing`, {
                        method: 'PATCH',
                        body: { nextHearingDate: hearingDraft, nextHearingPurpose: purposeDraft.trim() },
                      })
                      setCaseItem(res.data)
                      setActionMsg('শুনানির তারিখ সংরক্ষণ হয়েছে।')
                    } catch (err) {
                      setActionMsg(err instanceof ApiError ? err.message : 'সংরক্ষণ হয়নি।')
                    }
                  }}
                >
                  তারিখ সংরক্ষণ
                </Button>
              </CardContent>
            </Card>
          )}
          {canAddNotes && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">নোট যোগ</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea label="গুরুত্বপূর্ণ নোট" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
                <Button
                  onClick={async () => {
                    if (!caseItem) return
                    try {
                      const res = await api<{ data: Case }>(`/cases/${caseItem.id}`, {
                        method: 'PUT',
                        body: { importantNotes: noteDraft },
                      })
                      setCaseItem(res.data)
                      setActionMsg('নোট সংরক্ষণ হয়েছে।')
                    } catch (err) {
                      setActionMsg(err instanceof ApiError ? err.message : 'সংরক্ষণ হয়নি।')
                    }
                  }}
                >
                  নোট সংরক্ষণ
                </Button>
              </CardContent>
            </Card>
          )}
          {canDocs && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">ডকুমেন্ট যোগ</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input label="ফাইলের নাম" value={docName} onChange={(e) => setDocName(e.target.value)} />
                <Button
                  onClick={async () => {
                    if (!caseItem || !docName.trim()) return
                    try {
                      const res = await api<{ data: CaseDocument }>('/documents', {
                        method: 'POST',
                        body: { caseId: caseItem.id, name: docName.trim(), type: 'Other', fileType: 'PDF' },
                      })
                      setCaseDocs((prev) => [res.data, ...prev])
                      setDocName('')
                      setActionMsg('ডকুমেন্ট যোগ হয়েছে।')
                    } catch (err) {
                      setActionMsg(err instanceof ApiError ? err.message : 'যোগ হয়নি।')
                    }
                  }}
                >
                  যোগ করুন
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-border/70 bg-slate-panel/40">
            <h2 className="font-semibold">ডকুমেন্ট</h2>
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

        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-border/70 bg-slate-panel/40">
            <h2 className="font-semibold">টাস্ক</h2>
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
                {canTasks && t.status !== 'Completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={async () => {
                      try {
                        const res = await api<{ data: Task }>(`/tasks/${t.id}/status`, {
                          method: 'PATCH',
                          body: { status: 'Completed' },
                        })
                        setCaseTasks((prev) => prev.map((row) => (row.id === t.id ? res.data : row)))
                      } catch (err) {
                        setActionMsg(err instanceof ApiError ? err.message : 'টাস্ক আপডেট হয়নি।')
                      }
                    }}
                  >
                    সম্পন্ন
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-panel/50 px-3 py-2.5">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value || '—'}</dd>
    </div>
  )
}

function Note({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink">{value || '—'}</p>
    </div>
  )
}
