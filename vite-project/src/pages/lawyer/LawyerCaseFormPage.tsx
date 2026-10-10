import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  BdLocationFilters,
  type BdLocationFilterValues,
} from '@/components/search/BdLocationFilters'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { cases, staffMembers } from '@/data/mock'
import { api, ApiError } from '@/lib/api'
import { courtTypeLabel, findDivisionByDistrict, inferCourtType } from '@/lib/bdLocations'
import { caseNumberHint, normalizeCaseNumber } from '@/lib/caseNumber'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Case, Staff } from '@/types'

type Side = 'plaintiff' | 'defendant'

type MatchPreview = {
  id: string
  caseNumber: string
  caseTitle: string
  plaintiff: string
  defendant: string
  plaintiffLawyerId?: string
  defendantLawyerId?: string
  plaintiffLawyerName?: string
  defendantLawyerName?: string
  canOpen?: boolean
}

type FormState = {
  caseNumber: string
  caseTitle: string
  caseType: string
  status: string
  division: string
  district: string
  courtType: string
  courtName: string
  courtLocation: string
  filingDate: string
  nextHearingDate: string
  plaintiff: string
  defendant: string
  representingSide: Side | ''
  judgeName: string
  assignedStaffId: string
  description: string
  importantNotes: string
}

const emptyForm: FormState = {
  caseNumber: '',
  caseTitle: '',
  caseType: 'সিভিল স্যুট',
  status: 'Active',
  division: '',
  district: '',
  courtType: '',
  courtName: '',
  courtLocation: '',
  filingDate: '',
  nextHearingDate: '',
  plaintiff: '',
  defendant: '',
  representingSide: '',
  judgeName: '',
  assignedStaffId: '',
  description: '',
  importantNotes: '',
}

export default function LawyerCaseFormPage({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const user = useAuthStore((s) => s.user)
  const [myStaff, setMyStaff] = useState<Staff[]>(() =>
    staffMembers.filter((s) => s.lawyerId === user?.id && s.active),
  )
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [info, setInfo] = useState('')
  const [match, setMatch] = useState<MatchPreview | null>(null)

  useEffect(() => {
    api<{ data: Staff[] }>('/staff')
      .then((res) => setMyStaff((res.data || []).filter((s) => s.active)))
      .catch(() => setMyStaff(staffMembers.filter((s) => s.lawyerId === user?.id && s.active)))
  }, [user?.id])

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    const apply = (c: Case) => {
      const district = c.district || c.courtLocation || ''
      const side: Side | '' =
        c.representingSide ||
        (c.plaintiffLawyerId === user?.id
          ? 'plaintiff'
          : c.defendantLawyerId === user?.id
            ? 'defendant'
            : '')
      setForm({
        caseNumber: c.caseNumber || '',
        caseTitle: c.caseTitle || '',
        caseType: c.caseType || 'সিভিল স্যুট',
        status: c.status || 'Active',
        division: c.division || findDivisionByDistrict(district) || '',
        district,
        courtType: c.courtType || inferCourtType(c.courtName),
        courtName: c.courtName || '',
        courtLocation: c.courtLocation || district,
        filingDate: c.filingDate || '',
        nextHearingDate: c.nextHearingDate || '',
        plaintiff: c.plaintiff || '',
        defendant: c.defendant || '',
        representingSide: side,
        judgeName: c.judgeName || '',
        assignedStaffId: c.assignedStaffIds?.[0] || '',
        description: c.description || '',
        importantNotes: c.importantNotes || '',
      })
    }
    api<{ data: Case }>(`/cases/${id}`)
      .then((res) => apply(res.data))
      .catch(() => {
        const c = cases.find((x) => x.id === id)
        if (c) apply(c)
      })
  }, [mode, id, user?.id])

  // একই নম্বর+লোকেশনে আগে এন্ট্রি থাকলে বিপরীত উকিল অটো দেখাও
  useEffect(() => {
    if (mode === 'edit') return
    const num = normalizeCaseNumber(form.caseNumber)
    const ready =
      num.ok &&
      form.caseType &&
      form.division &&
      form.district &&
      form.courtType &&
      form.courtName.trim()
    if (!ready) {
      setMatch(null)
      return
    }
    let cancelled = false
    const qs = new URLSearchParams({
      q: num.value,
      caseType: form.caseType,
      division: form.division,
      district: form.district,
      courtType: form.courtType,
      court: form.courtName.trim(),
    })
    api<{ data: MatchPreview | null }>(`/cases/match?${qs}`)
      .then((res) => {
        if (!cancelled) setMatch(res.data)
      })
      .catch(() => {
        if (!cancelled) setMatch(null)
      })
    return () => {
      cancelled = true
    }
  }, [mode, form.caseNumber, form.caseType, form.division, form.district, form.courtType, form.courtName])

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const locationValue: BdLocationFilterValues = {
    division: form.division,
    district: form.district,
    courtType: form.courtType,
    court: form.courtName,
  }

  const onLocationChange = (next: BdLocationFilterValues) => {
    setForm((f) => ({
      ...f,
      division: next.division,
      district: next.district,
      courtType: next.courtType,
      courtName: next.court,
      courtLocation: next.district,
    }))
  }

  const onCaseNumberBlur = () => {
    const n = normalizeCaseNumber(form.caseNumber)
    if (n.ok && n.value !== form.caseNumber.trim()) {
      set('caseNumber', n.value)
      setInfo(`মামলা নম্বর সংশোধন: ${n.value} (বছর ৪ সংখ্যা)`)
    }
  }

  const oppositeFromMatch = () => {
    if (!match || !form.representingSide) return null
    if (form.representingSide === 'plaintiff') {
      return match.defendantLawyerName
        ? { name: match.defendantLawyerName, side: 'বিবাদীপক্ষ' }
        : null
    }
    return match.plaintiffLawyerName
      ? { name: match.plaintiffLawyerName, side: 'বাদীপক্ষ' }
      : null
  }

  const opposite = oppositeFromMatch()

  const buildPayload = () => {
    const myName = user?.name || ''
    const side = form.representingSide as Side
    const num = normalizeCaseNumber(form.caseNumber)
    return {
      caseNumber: num.ok ? num.value : form.caseNumber.trim(),
      caseTitle: form.caseTitle.trim(),
      caseType: form.caseType,
      status: form.status,
      division: form.division,
      district: form.district,
      courtType: form.courtType,
      courtName: form.courtName.trim(),
      courtLocation: form.district || form.courtLocation.trim(),
      filingDate: form.filingDate,
      nextHearingDate: form.nextHearingDate,
      plaintiff: form.plaintiff.trim(),
      defendant: form.defendant.trim(),
      representingSide: side,
      plaintiffLawyerName: side === 'plaintiff' ? myName : '',
      defendantLawyerName: side === 'defendant' ? myName : '',
      plaintiffLawyerId: side === 'plaintiff' ? user?.id : undefined,
      defendantLawyerId: side === 'defendant' ? user?.id : undefined,
      judgeName: form.judgeName.trim(),
      description: form.description.trim(),
      importantNotes: form.importantNotes.trim(),
      assignedStaffIds: form.assignedStaffId ? [form.assignedStaffId] : [],
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    setInfo('')

    const num = normalizeCaseNumber(form.caseNumber)
    if (!num.ok) {
      setError(num.error)
      return
    }
    setForm((f) => ({ ...f, caseNumber: num.value }))

    if (!form.caseTitle.trim()) {
      setError('মামলার শিরোনাম আবশ্যক।')
      return
    }
    if (!form.division || !form.district || !form.courtType || !form.courtName.trim()) {
      setError('বিভাগ, জেলা, আদালতের ধরন ও আদালত — চারটিই নির্বাচন করুন।')
      return
    }
    if (!form.representingSide) {
      setError('আপনি বাদীপক্ষ নাকি বিবাদীপক্ষ — নির্বাচন করুন।')
      return
    }
    if (!form.filingDate || !form.nextHearingDate) {
      setError('ফাইলিং তারিখ ও পরবর্তী শুনানির তারিখ আবশ্যক।')
      return
    }
    if (!form.plaintiff.trim() || !form.defendant.trim()) {
      setError('বাদী ও বিবাদীর নাম আবশ্যক।')
      return
    }
    if (mode !== 'edit' && match) {
      setError('এই মামলাটি আগে এন্ট্রি হয়েছে। দ্বিতীয়বার এন্ট্রি করা যাবে না।')
      return
    }

    setSaving(true)
    const payload = buildPayload()

    try {
      if (mode === 'edit' && id) {
        await api(`/cases/${id}`, { method: 'PUT', body: payload })
        setInfo('মামলা আপডেট হয়েছে।')
      } else {
        const res = await api<{ data: Case; merged?: boolean; message?: string }>('/cases', {
          method: 'POST',
          body: payload,
        })
        setInfo(res.message || (res.merged ? 'একই মামলায় যোগ হয়েছে।' : 'নতুন মামলা সংরক্ষণ হয়েছে।'))
      }
      setSaved(true)
      const home = user?.role === 'STAFF' ? '/staff/cases' : '/lawyer/cases'
      setTimeout(() => navigate(home), 900)
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 403 || err.status === 404 || err.status === 409)) {
        setError(err.message)
        setSaving(false)
        return
      }
      if (!user?.id) {
        setError('লগইন সেশন পাওয়া যায়নি। আবার লগইন করুন।')
        setSaving(false)
        return
      }
      // offline merge simulation
      const key = `${payload.caseNumber}|${payload.division}|${payload.district}|${payload.courtName}`
      const existing = cases.find(
        (c) =>
          `${c.caseNumber}|${c.division || ''}|${c.district || c.courtLocation}|${c.courtName}` ===
          key,
      )
      if (existing && mode !== 'edit') {
        if (payload.representingSide === 'plaintiff') {
          existing.plaintiffLawyerId = user.id
          existing.plaintiffLawyerName = user.name
        } else {
          existing.defendantLawyerId = user.id
          existing.defendantLawyerName = user.name
        }
        setInfo('একই মামলায় যোগ হয়েছে (লোকাল)।')
      } else if (mode === 'edit' && id) {
        const idx = cases.findIndex((c) => c.id === id)
        if (idx >= 0) {
          cases[idx] = {
            ...cases[idx],
            ...payload,
            status: payload.status as Case['status'],
            id,
            ownerLawyerId: cases[idx].ownerLawyerId,
          }
        }
      } else {
        cases.unshift({
          id: `case-${Date.now()}`,
          ...payload,
          status: payload.status as Case['status'],
          privateNotes: '',
          ownerLawyerId: user.id,
          plaintiffLawyerId: payload.plaintiffLawyerId,
          defendantLawyerId: payload.defendantLawyerId,
        })
      }
      setSaved(true)
      const home = user?.role === 'STAFF' ? '/staff/cases' : '/lawyer/cases'
      setTimeout(() => navigate(home), 900)
    }
    setSaving(false)
  }

  const numberHint = caseNumberHint(form.caseNumber)

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-8">
      {saved && (
        <div className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-2xl bg-[#146a74] px-4 py-3 text-white shadow-xl">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">সংরক্ষণ হয়েছে</p>
            <p className="text-sm text-white/90">{info || 'মামলা সেভ হয়েছে।'}</p>
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {mode === 'edit' ? 'মামলা আপডেট' : 'নতুন মামলা'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          মামলার ধরন, বিভাগ, জেলা, আদালতের ধরন ও আদালত — পাঁচটা একসাথে মিললে আগের এন্ট্রি দেখাবে। একটাও আলাদা হলে নতুন মামলা হিসেবে যাবে।
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <section className="grid gap-4 rounded-2xl border border-border/80 bg-white p-5 shadow-sm sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-display text-lg font-semibold text-ink">মামলার পরিচয়</h2>
        <div>
          <Input
            label="মামলা নম্বর"
            required
            placeholder="1/2026"
            value={form.caseNumber}
            onChange={(e) => set('caseNumber', e.target.value)}
            onBlur={onCaseNumberBlur}
          />
          <p
            className={cn(
              'mt-1 text-xs',
              normalizeCaseNumber(form.caseNumber).ok ? 'text-teal' : 'text-muted',
            )}
          >
            {numberHint}
          </p>
        </div>
        <Input
          label="Case Title"
          required
          value={form.caseTitle}
          onChange={(e) => set('caseTitle', e.target.value)}
        />
        <Select
          label="Case Type"
          required
          value={form.caseType}
          onChange={(e) => set('caseType', e.target.value)}
          options={['সিভিল স্যুট', 'ফৌজদারি', 'পারিবারিক', 'কর্পোরেট', 'জমি জমা'].map((v) => ({
            value: v,
            label: v,
          }))}
        />
        <Select
          label="Case Status"
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
          options={['Active', 'Pending', 'Hearing Scheduled', 'Disposed', 'Closed'].map((v) => ({
            value: v,
            label: v,
          }))}
        />

        </section>

        <section className="space-y-3 rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ink">আদালত</h2>
          <p className="text-xs text-muted">বিভাগ, জেলা, আদালতের ধরন ও আদালত — চারটাই এই মামলার ঠিকানা।</p>
          <BdLocationFilters mode="entry" value={locationValue} onChange={onLocationChange} />
        </section>

        {match && mode !== 'edit' && (
          <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold text-amber-950">এই মামলাটি আগে এন্ট্রি হয়েছে</p>
                <p className="mt-1 text-sm text-amber-900">
                  মামলার ধরন, বিভাগ, জেলা, আদালতের ধরন ও আদালত — পাঁচটাই মিলেছে। দ্বিতীয়বার এন্ট্রি হবে না।
                </p>
                <p className="mt-3 text-sm font-semibold text-ink">
                  {match.caseNumber} — {match.caseTitle || 'শিরোনাম নেই'}
                </p>
                <p className="mt-1 text-sm text-ink">
                  ধরন: {match.caseType || form.caseType} · আদালত: {form.courtName}
                  {form.courtType ? ` · ${courtTypeLabel(form.courtType)}` : ''}
                </p>
                <p className="mt-2 text-sm text-ink">
                  বাদীপক্ষের উকিল: <strong>{match.plaintiffLawyerName || 'এখনো নেই'}</strong>
                  {' · '}
                  বিবাদীপক্ষের উকিল: <strong>{match.defendantLawyerName || 'এখনো নেই'}</strong>
                </p>
                {match.canOpen ? (
                  <Link to={`/lawyer/cases/${match.id}`} className="mt-3 inline-flex text-sm font-semibold text-[#1d4ed8] hover:underline">
                    আগের মামলাটি খুলুন
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <section className="grid gap-4 rounded-2xl border border-border/80 bg-white p-5 shadow-sm sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-display text-lg font-semibold text-ink">পক্ষ, তারিখ ও নোট</h2>

        <Input
          label="Filing Date"
          type="date"
          required
          value={form.filingDate}
          onChange={(e) => set('filingDate', e.target.value)}
        />
        <Input
          label="Next Hearing Date"
          type="date"
          required
          value={form.nextHearingDate}
          onChange={(e) => set('nextHearingDate', e.target.value)}
        />
        <Input
          label="বাদী"
          required
          value={form.plaintiff}
          onChange={(e) => set('plaintiff', e.target.value)}
        />
        <Input
          label="বিবাদী"
          required
          value={form.defendant}
          onChange={(e) => set('defendant', e.target.value)}
        />

        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-medium text-ink">আপনি কোন পক্ষ? *</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                { value: 'plaintiff' as const, label: 'বাদীপক্ষ', hint: 'আপনার নাম বাদীর উকিল হিসেবে যাবে' },
                { value: 'defendant' as const, label: 'বিবাদীপক্ষ', hint: 'আপনার নাম বিবাদীর উকিল হিসেবে যাবে' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('representingSide', opt.value)}
                className={cn(
                  'rounded-xl border px-4 py-3 text-left transition',
                  form.representingSide === opt.value
                    ? 'border-teal bg-teal/10 shadow-sm'
                    : 'border-border bg-white hover:border-teal/40',
                )}
              >
                <p className="font-semibold text-ink">{opt.label}</p>
                <p className="mt-0.5 text-xs text-muted">{opt.hint}</p>
              </button>
            ))}
          </div>
          {form.representingSide && (
            <p className="mt-2 rounded-lg bg-slate-panel px-3 py-2 text-sm text-ink">
              আপনি:{' '}
              <span className="font-semibold text-teal">{user?.name}</span> —{' '}
              {form.representingSide === 'plaintiff' ? 'বাদীপক্ষের উকিল' : 'বিবাদীপক্ষের উকিল'}
              {opposite ? (
                <>
                  {' '}
                  · বিপরীত পক্ষ: <span className="font-semibold">{opposite.name}</span>
                </>
              ) : null}
            </p>
          )}
        </div>

        <Input
          label="Judge Name"
          value={form.judgeName}
          onChange={(e) => set('judgeName', e.target.value)}
        />
        <div className="sm:col-span-2">
          {myStaff.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-slate-panel/50 px-3 py-3 text-sm text-muted">
              <p className="font-medium text-ink">Assigned Staff</p>
              <p className="mt-1">এখনো কোনো Staff নেই — আপনি নিজেই পরিচালনা করবেন।</p>
            </div>
          ) : (
            <Select
              label="Assigned Staff"
              placeholder="নিজে পরিচালনা / পরে অ্যাসাইন"
              value={form.assignedStaffId}
              onChange={(e) => set('assignedStaffId', e.target.value)}
              options={myStaff.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.staffCode})`,
              }))}
            />
          )}
        </div>
        <div className="sm:col-span-2">
          <Textarea
            label="Case Description"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Textarea
            label="Important Notes"
            value={form.importantNotes}
            onChange={(e) => set('importantNotes', e.target.value)}
          />
        </div>
        {error && <p className="sm:col-span-2 text-sm font-semibold text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={saving || (mode !== 'edit' && Boolean(match))}>
            {saving ? 'সংরক্ষণ হচ্ছে...' : mode === 'edit' ? 'আপডেট করুন' : 'মামলা সেভ করুন'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            বাতিল
          </Button>
        </div>
        </section>
      </form>
    </div>
  )
}
