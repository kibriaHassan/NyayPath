import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  FileText,
  Gavel,
  MapPin,
  Pencil,
  Scale,
  StickyNote,
  Users,
} from 'lucide-react'
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
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { courtTypeLabel, inferCourtType } from '@/lib/bdLocations'
import { HEARING_PURPOSE_OPTIONS } from '@/lib/courtCalendar'
import { cn, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Case, CaseDocument, Hearing, Staff, StaffPermissions, Task } from '@/types'

export default function CaseDetailsPage({ basePath = '/lawyer' }: { basePath?: string }) {
  const { id } = useParams()
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
  const [actionMsg, setActionMsg] = useState('')
  const [staffPerms, setStaffPerms] = useState<StaffPermissions | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [hearingDraft, setHearingDraft] = useState('')
  const [purposeDraft, setPurposeDraft] = useState('')
  const [customPurpose, setCustomPurpose] = useState('')
  const [savingHearing, setSavingHearing] = useState(false)
  const [hearingNotice, setHearingNotice] = useState<'success' | 'already' | null>(null)
  const [docName, setDocName] = useState('')
  const [showPastForm, setShowPastForm] = useState(false)
  const [pastDate, setPastDate] = useState('')
  const [pastPurpose, setPastPurpose] = useState('')
  const [pastCustomPurpose, setPastCustomPurpose] = useState('')
  const [pastNotes, setPastNotes] = useState('')
  const [savingPast, setSavingPast] = useState(false)

  const isLawyer = user?.role === 'LAWYER'
  const canEditCase = isLawyer || Boolean(staffPerms?.editCases)
  const canEditHearing = isLawyer || Boolean(staffPerms?.editHearingDates || staffPerms?.editCases)
  const canAddNotes = !isLawyer && Boolean(staffPerms?.addNotes)
  const canDocs = !isLawyer && Boolean(staffPerms?.manageDocuments)
  const canTasks = !isLawyer && Boolean(staffPerms?.manageTasks)
  const canSeePrivate = isLawyer || user?.role === 'STAFF'

  useEffect(() => {
    if (!hearingNotice) return
    const timer = window.setTimeout(() => setHearingNotice(null), hearingNotice === 'already' ? 2600 : 2000)
    return () => window.clearTimeout(timer)
  }, [hearingNotice])

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

  const savePastHearing = async () => {
    if (!caseItem || !isLawyer) return
    const purposeValue = pastPurpose === 'অন্যান্য' ? pastCustomPurpose.trim() : pastPurpose.trim()
    const day = pastDate.trim().slice(0, 10)
    if (!day || !purposeValue) {
      setActionMsg('পুরাতন তারিখ এবং সেদিন কী হয়েছিল — দুটোই দিন।')
      return
    }
    const filing = String(caseItem.filingDate || '').slice(0, 10)
    if (filing && day <= filing) {
      setActionMsg(
        day === filing
          ? 'দাখিলের তারিখ আলাদাভাবে আছে — পুরাতন শুনানি হিসেবে আবার এন্ট্রি করা যাবে না।'
          : 'দাখিলের তারিখের আগের শুনানি এন্ট্রি করা যায় না।',
      )
      return
    }
    const d = new Date(`${day}T00:00:00`)
    if (d.getDay() === 5 || d.getDay() === 6) {
      setActionMsg('শুক্রবার/শনিবার আদালত বন্ধ।')
      return
    }
    if (savingPast) return
    setSavingPast(true)
    try {
      const res = await api<{ data: Hearing; case: Case }>(`/cases/${caseItem.id}/past-hearings`, {
        method: 'POST',
        body: {
          hearingDate: day,
          hearingType: purposeValue,
          notes: pastNotes.trim() || undefined,
        },
      })
      setCaseItem(res.case)
      setCaseHearings((prev) => {
        const next = prev.filter((h) => h.id !== res.data.id)
        return [...next, res.data]
      })
      setPastDate('')
      setPastPurpose('')
      setPastCustomPurpose('')
      setPastNotes('')
      setShowPastForm(false)
      setActionMsg('')
      setHearingNotice('success')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'HEARING_ALREADY_ENTERED') {
        setHearingNotice('already')
        setActionMsg('')
      } else {
        setActionMsg(err instanceof ApiError ? err.message : 'সংরক্ষণ হয়নি।')
      }
    } finally {
      setSavingPast(false)
    }
  }

  const saveHearing = async () => {
    const purposeValue = purposeDraft === 'অন্যান্য' ? customPurpose.trim() : purposeDraft.trim()
    const nextDate = hearingDraft.trim().slice(0, 10)
    if (!caseItem || !nextDate || !purposeValue) return
    const currentNext = String(caseItem.nextHearingDate || '').slice(0, 10)
    const currentPurpose = String(caseItem.nextHearingPurpose || '').trim()
    if (currentNext && currentNext === nextDate && currentPurpose === purposeValue) {
      setHearingNotice('already')
      setActionMsg('')
      return
    }
    const day = new Date(`${nextDate}T00:00:00`)
    if (day.getDay() === 5 || day.getDay() === 6) {
      setActionMsg('শুক্রবার/শনিবার আদালত বন্ধ। অন্য তারিখ দিন।')
      return
    }
    if (savingHearing) return
    setSavingHearing(true)
    try {
      const res = await api<{ data: Case }>(`/cases/${caseItem.id}/next-hearing`, {
        method: 'PATCH',
        body: { nextHearingDate: nextDate, nextHearingPurpose: purposeValue },
      })
      setCaseItem(res.data)
      setHearingDraft(res.data.nextHearingDate || nextDate)
      const p = res.data.nextHearingPurpose || purposeValue
      if (p && !HEARING_PURPOSE_OPTIONS.some((o) => o.value === p)) {
        setPurposeDraft('অন্যান্য')
        setCustomPurpose(p)
      } else {
        setPurposeDraft(p)
        setCustomPurpose('')
      }
      const hearingsRes = await api<{ data: Hearing[] }>('/hearings').catch(() => null)
      if (hearingsRes?.data) {
        setCaseHearings(hearingsRes.data.filter((h) => h.caseId === caseItem.id))
      }
      setActionMsg('')
      setHearingNotice('success')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'HEARING_ALREADY_ENTERED') {
        setHearingNotice('already')
        setActionMsg('')
      } else {
        setActionMsg(err instanceof ApiError ? err.message : 'সংরক্ষণ হয়নি।')
      }
    } finally {
      setSavingHearing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted">মামলা লোড হচ্ছে…</p>
      </div>
    )
  }

  if (!caseItem) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-white p-8 text-center">
        <p className="text-muted">{error || 'মামলা পাওয়া যায়নি।'}</p>
        <Link to={`${basePath}/cases`} className="inline-flex text-sm font-semibold text-teal hover:underline">
          মামলার তালিকায় ফিরে যান
        </Link>
      </div>
    )
  }

  const assignedIds = caseItem.assignedStaffIds || []
  const owner = getLawyerById(caseItem.ownerLawyerId)
  const resolveStaff = (sid: string) => staffList.find((s) => s.id === sid) || getStaffById(sid)
  const courtKind =
    courtTypeLabel(caseItem.courtType) || courtTypeLabel(inferCourtType(caseItem.courtName)) || '—'
  const plaintiffLawyer =
    caseItem.plaintiffLawyerName ||
    (caseItem.plaintiffLawyerId ? getLawyerById(caseItem.plaintiffLawyerId)?.fullName : '') ||
    '— (এখনো নেই)'
  const defendantLawyer =
    caseItem.defendantLawyerName ||
    (caseItem.defendantLawyerId ? getLawyerById(caseItem.defendantLawyerId)?.fullName : '') ||
    '— (এখনো নেই)'
  const sortedHearings = [...caseHearings].sort((a, b) =>
    String(a.hearingDate).localeCompare(String(b.hearingDate)),
  )

  return (
    <div className="space-y-6 pb-10">
      {hearingNotice ? (
        <button
          type="button"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-6"
          onClick={() => setHearingNotice(null)}
        >
          <div
            className={cn(
              'w-full max-w-sm rounded-2xl px-7 py-8 text-center text-white shadow-xl',
              hearingNotice === 'already' ? 'bg-amber-700' : 'bg-teal',
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className={cn(
                'font-display font-bold',
                hearingNotice === 'already' ? 'text-2xl leading-snug md:text-3xl' : 'text-xl',
              )}
            >
              {hearingNotice === 'already' ? 'এটি আগে এন্ট্রি হয়েছে।' : 'Success'}
            </p>
            <p className="mt-3 text-sm font-medium text-white/90">
              {hearingNotice === 'already'
                ? 'একই তারিখ ও বিবরণ আবার সেভ করা যাবে না।'
                : 'শুনানির তারিখ সংরক্ষণ হয়েছে।'}
            </p>
          </div>
        </button>
      ) : null}

      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-teal/15 bg-gradient-to-br from-teal/[0.08] via-white to-slate-panel/60 shadow-sm">
        <div className="border-b border-border/60 px-5 py-3 sm:px-6">
          <Link
            to={`${basePath}/cases`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-teal"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            সব মামলা
          </Link>
        </div>
        <div className="flex flex-col gap-5 px-5 py-6 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-teal/10 px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-teal">
                {caseItem.caseNumber}
              </span>
              <Badge variant={statusBadgeVariant(caseItem.status)}>{caseItem.status}</Badge>
              {caseItem.caseType ? <Badge variant="muted">{caseItem.caseType}</Badge> : null}
            </div>
            <h1 className="font-display text-2xl font-semibold leading-snug text-ink md:text-3xl">
              {caseItem.caseTitle}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-teal" />
                {caseItem.courtName || '—'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-teal" />
                {[caseItem.district || caseItem.courtLocation, caseItem.division].filter(Boolean).join(' · ') || '—'}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <div className="min-w-[200px] rounded-xl border border-teal/20 bg-white/90 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-teal">পরবর্তী শুনানি</p>
              <p className="mt-1 font-display text-lg font-bold text-ink">
                {caseItem.nextHearingDate ? formatDate(caseItem.nextHearingDate) : 'নির্ধারিত নয়'}
              </p>
              <p className="mt-0.5 text-xs text-muted">{caseItem.nextHearingPurpose || 'বিবরণ নেই'}</p>
            </div>
            {canEditCase ? (
              <Link to={`${basePath}/cases/${caseItem.id}/edit`}>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  মামলা এডিট
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {actionMsg ? (
        <p className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-2.5 text-sm font-medium text-teal">
          {actionMsg}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {/* Court */}
          <SectionCard icon={Gavel} title="আদালত ও অবস্থান">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetaTile label="বিভাগ" value={caseItem.division || '—'} />
              <MetaTile label="জেলা" value={caseItem.district || caseItem.courtLocation || '—'} />
              <MetaTile label="আদালতের ধরন" value={courtKind} />
              <MetaTile label="আদালত" value={caseItem.courtName || '—'} className="sm:col-span-2" />
              <MetaTile label="বিচারক" value={caseItem.judgeName || '—'} />
            </div>
          </SectionCard>

          {/* Parties */}
          <SectionCard icon={Scale} title="পক্ষ ও উকিল">
            <div className="grid gap-3 md:grid-cols-2">
              <PartyPanel
                side="বাদী"
                name={caseItem.plaintiff || '—'}
                lawyer={plaintiffLawyer}
                tone="teal"
              />
              <PartyPanel
                side="বিবাদী"
                name={caseItem.defendant || '—'}
                lawyer={defendantLawyer}
                tone="ink"
              />
            </div>
            <p className="mt-3 text-xs text-muted">
              মালিক উকিল · <span className="font-semibold text-ink">{owner?.fullName || user?.name || '—'}</span>
            </p>
          </SectionCard>

          {/* Dates & notes */}
          <SectionCard icon={StickyNote} title="তারিখ ও নোট">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetaTile label="দাখিলের তারিখ" value={formatDate(caseItem.filingDate)} />
              <MetaTile label="সেদিনের কাজ (পরবর্তী)" value={caseItem.nextHearingPurpose || '—'} />
            </div>

            {isLawyer ? (
              <div className="mt-4 rounded-xl border border-dashed border-teal/35 bg-teal/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">পুরাতন শুনানির তারিখ</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      দাখিলের পরের দিন থেকে পরবর্তী তারিখের আগ পর্যন্ত পুরোনো শুনানি যোগ করুন (দাখিলের দিন নয়)। শুধু
                      উকিল।
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={showPastForm ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={() => setShowPastForm((v) => !v)}
                  >
                    {showPastForm ? 'বন্ধ' : 'পুরাতন তারিখ যোগ'}
                  </Button>
                </div>
                {showPastForm ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Input
                      label="পুরাতন তারিখ"
                      type="date"
                      value={pastDate}
                      onChange={(e) => setPastDate(e.target.value)}
                      hint="দাখিলের পরের দিন থেকে · আজকের আগে · পরবর্তী তারিখের আগে (দাখিলের দিন নয়)"
                    />
                    <Select
                      label="সেদিন কী হয়েছিল"
                      value={pastPurpose}
                      placeholder="রায়, আদেশ…"
                      options={HEARING_PURPOSE_OPTIONS}
                      onChange={(e) => {
                        setPastPurpose(e.target.value)
                        if (e.target.value !== 'অন্যান্য') setPastCustomPurpose('')
                      }}
                    />
                    {pastPurpose === 'অন্যান্য' ? (
                      <Input
                        label="অন্যান্য বিবরণ"
                        value={pastCustomPurpose}
                        onChange={(e) => setPastCustomPurpose(e.target.value)}
                      />
                    ) : null}
                    <div className="sm:col-span-2">
                      <Input
                        label="নোট (ঐচ্ছিক)"
                        value={pastNotes}
                        onChange={(e) => setPastNotes(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button disabled={savingPast} onClick={() => void savePastHearing()}>
                        {savingPast ? 'সংরক্ষণ হচ্ছে…' : 'পুরাতন তারিখ সংরক্ষণ'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4">
              <MetaTile
                label="পরবর্তী শুনানি"
                value={formatDate(caseItem.nextHearingDate)}
                highlight
              />
            </div>

            <div className="mt-4 space-y-3">
              <NoteBlock label="বিবরণ" value={caseItem.description} />
              <NoteBlock label="গুরুত্বপূর্ণ নোট" value={caseItem.importantNotes} />
              {canSeePrivate ? (
                <div className="rounded-xl border border-danger/15 bg-danger/[0.04] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-danger">ব্যক্তিগত নোট</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink">{caseItem.privateNotes || '—'}</p>
                </div>
              ) : null}
            </div>
          </SectionCard>

          {/* Docs & tasks */}
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard icon={FileText} title="ডকুমেন্ট" compact>
              {caseDocs.length === 0 ? (
                <EmptyHint text="কোনো ডকুমেন্ট নেই।" />
              ) : (
                <ul className="space-y-2">
                  {caseDocs.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-slate-panel/30 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{d.name}</p>
                        <p className="text-[11px] text-muted">
                          {d.type} · {formatDate(d.uploadDate)}
                        </p>
                      </div>
                      <Badge variant="muted">{d.fileType}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard icon={CheckSquare} title="টাস্ক" compact>
              {caseTasks.length === 0 ? (
                <EmptyHint text="কোনো টাস্ক নেই।" />
              ) : (
                <ul className="space-y-2">
                  {caseTasks.map((t) => (
                    <li key={t.id} className="rounded-xl border border-border/70 bg-slate-panel/30 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{t.title}</p>
                        <Badge variant={statusBadgeVariant(t.status)}>{t.status}</Badge>
                      </div>
                      <p className="mt-1 text-[11px] text-muted">Due · {formatDate(t.dueDate)}</p>
                      {canTasks && t.status !== 'Completed' ? (
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
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <SectionCard icon={CalendarDays} title="শুনানির ইতিহাস" compact>
            <p className="mb-2 text-[11px] text-muted">পুরোনো তারিখ উপরে · নতুন তারিখ নিচে</p>
            {sortedHearings.length === 0 && !caseItem.nextHearingDate ? (
              <EmptyHint text="কোনো শুনানি নেই।" />
            ) : null}
            {sortedHearings.length === 0 && caseItem.nextHearingDate ? (
              <div className="rounded-xl border border-teal/20 bg-teal/[0.06] px-3 py-3">
                <p className="text-sm font-bold text-ink">{formatDate(caseItem.nextHearingDate)}</p>
                <p className="text-xs text-muted">পরবর্তী নির্ধারিত শুনানি</p>
              </div>
            ) : null}
            <div className="relative space-y-0">
              {sortedHearings.map((h, i) => (
                <button
                  key={h.id}
                  type="button"
                  className="group relative flex w-full gap-3 py-2.5 text-left first:pt-0 last:pb-0"
                  onClick={() => {
                    setHearingDraft('')
                    setPurposeDraft(h.hearingType || '')
                    setActionMsg('নতুন পরবর্তী তারিখ এন্ট্রি করুন — তারিখ ফিল্ড খালি।')
                  }}
                >
                  <span className="relative z-10 mt-1.5 flex h-2.5 w-2.5 shrink-0 rounded-full bg-teal ring-4 ring-teal/15" />
                  {i < sortedHearings.length - 1 ? (
                    <span className="absolute left-[4.5px] top-5 bottom-0 w-px bg-border" />
                  ) : null}
                  <span className="min-w-0 flex-1 rounded-xl border border-transparent px-2.5 py-2 transition group-hover:border-teal/20 group-hover:bg-teal/[0.04]">
                    <span className="block text-sm font-semibold text-ink">{formatDate(h.hearingDate)}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {h.hearingTime ? `${h.hearingTime} · ` : ''}
                      {h.hearingType || '—'}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard icon={Users} title="দায়িত্বপ্রাপ্ত স্টাফ" compact>
            {assignedIds.length === 0 ? (
              <EmptyHint text="স্টাফ অ্যাসাইন নেই — উকিল নিজে পরিচালনা করছেন।" />
            ) : (
              <ul className="space-y-2.5">
                {assignedIds.map((sid) => {
                  const s = resolveStaff(sid)
                  if (!s) {
                    return (
                      <li key={sid} className="text-sm text-muted">
                        Staff ID: {sid}
                      </li>
                    )
                  }
                  return (
                    <li
                      key={sid}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-slate-panel/30 px-3 py-2.5"
                    >
                      <img
                        src={s.photo}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">
                          {s.name}
                          {s.staffCode ? (
                            <span className="ml-1.5 font-mono text-[11px] font-bold text-teal">{s.staffCode}</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted">{s.role}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </SectionCard>

          {canEditHearing ? (
            <Card className="overflow-hidden rounded-2xl border-teal/20 shadow-sm">
              <CardHeader className="border-b border-teal/10 bg-gradient-to-r from-teal/[0.08] to-transparent">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/15 text-teal">
                    <ClipboardList className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-ink">পরবর্তী শুনানির তারিখ</h2>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      তারিখ আসা পর্যন্ত এডিট করা যাবে — নতুন তারিখ দিলে আগেরটি বদলে যাবে।
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <Input
                  label="তারিখ"
                  type="date"
                  value={hearingDraft}
                  onFocus={() => {
                    if (hearingDraft) setHearingDraft('')
                  }}
                  onChange={(e) => setHearingDraft(e.target.value)}
                  hint="ক্লিক করলে খালি হবে · শুক্র/শনি বাদ"
                />
                <Select
                  label="সেদিন কী হবে"
                  value={purposeDraft}
                  placeholder="রায়, আদেশ…"
                  options={HEARING_PURPOSE_OPTIONS}
                  onChange={(e) => {
                    setPurposeDraft(e.target.value)
                    if (e.target.value !== 'অন্যান্য') setCustomPurpose('')
                  }}
                />
                {purposeDraft === 'অন্যান্য' ? (
                  <Input
                    label="অন্যান্য বিবরণ"
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                  />
                ) : null}
                <Button disabled={savingHearing} className="w-full" onClick={() => void saveHearing()}>
                  {savingHearing ? 'সংরক্ষণ হচ্ছে…' : 'তারিখ সংরক্ষণ'}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {canAddNotes ? (
            <SectionCard icon={StickyNote} title="নোট যোগ" compact>
              <div className="space-y-3">
                <Textarea label="গুরুত্বপূর্ণ নোট" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
                <Button
                  className="w-full"
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
              </div>
            </SectionCard>
          ) : null}

          {canDocs ? (
            <SectionCard icon={FileText} title="ডকুমেন্ট যোগ" compact>
              <div className="space-y-3">
                <Input label="ফাইলের নাম" value={docName} onChange={(e) => setDocName(e.target.value)} />
                <Button
                  className="w-full"
                  onClick={async () => {
                    if (!caseItem || !docName.trim()) return
                    try {
                      const res = await api<{ data: CaseDocument }>('/documents', {
                        method: 'POST',
                        body: {
                          caseId: caseItem.id,
                          name: docName.trim(),
                          type: 'Other',
                          fileType: 'PDF',
                        },
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
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  children,
  compact,
}: {
  icon: typeof Gavel
  title: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-slate-panel/35 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-teal shadow-sm ring-1 ring-border/60">
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold tracking-tight text-ink">{title}</h2>
        </div>
      </CardHeader>
      <CardContent className={cn(compact ? 'px-4 py-4' : 'px-5 py-5')}>{children}</CardContent>
    </Card>
  )
}

function MetaTile({
  label,
  value,
  highlight,
  className,
}: {
  label: string
  value: string
  highlight?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl px-3.5 py-3',
        highlight
          ? 'border border-teal/25 bg-teal/[0.06]'
          : 'border border-border/60 bg-slate-panel/40',
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className={cn('mt-1 text-sm font-semibold leading-snug', highlight ? 'text-teal' : 'text-ink')}>
        {value || '—'}
      </p>
    </div>
  )
}

function PartyPanel({
  side,
  name,
  lawyer,
  tone,
}: {
  side: string
  name: string
  lawyer: string
  tone: 'teal' | 'ink'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3.5',
        tone === 'teal' ? 'border-teal/20 bg-teal/[0.04]' : 'border-border/70 bg-slate-panel/40',
      )}
    >
      <p
        className={cn(
          'text-[10px] font-bold uppercase tracking-wider',
          tone === 'teal' ? 'text-teal' : 'text-muted',
        )}
      >
        {side}
      </p>
      <p className="mt-1.5 text-sm font-bold text-ink">{name}</p>
      <p className="mt-2 text-[11px] text-muted">উকিল</p>
      <p className="text-sm font-medium text-ink">{lawyer}</p>
    </div>
  )
}

function NoteBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink">{value || '—'}</p>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-muted">{text}</p>
}
