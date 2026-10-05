import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import { findDivisionByDistrict } from '@/lib/bdLocations'
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
        courtType: '',
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
    if (!num.ok || !form.division || !form.district || !form.courtName) {
      setMatch(null)
      return
    }
    let cancelled = false
    const qs = new URLSearchParams({
      q: num.value,
      division: form.division,
      district: form.district,
      court: form.courtName,
    })
    api<{ data: MatchPreview | null }>(`/cases/match?${qs}`)
      .then((res) => {
        if (cancelled) return
        const m = res.data
        setMatch(m)
        if (!m) return
        setForm((f) => ({
          ...f,
          caseTitle: f.caseTitle || m.caseTitle || '',
          plaintiff: f.plaintiff || m.plaintiff || '',
          defendant: f.defendant || m.defendant || '',
        }))
      })
      .catch(() => {
        if (!cancelled) setMatch(null)
      })
    return () => {
      cancelled = true
    }
  }, [mode, form.caseNumber, form.division, form.district, form.courtName])

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
      setTimeout(() => navigate('/lawyer/cases'), 900)
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
      setTimeout(() => navigate('/lawyer/cases'), 900)
    }
    setSaving(false)
  }

  const numberHint = caseNumberHint(form.caseNumber)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {mode === 'edit' ? 'Edit Case' : 'Add New Case'}
        </h1>
        <p className="text-sm text-muted">
          মামলা নম্বর সবসময় <strong className="text-ink">1/2026</strong> ফরম্যাটে —{' '}
          <strong className="text-ink">1/26</strong> নয়। একই নম্বর+আদালতে অন্য পক্ষ আগে এন্ট্রি
          করলে উকিলের নাম অটো বসবে।
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-xl border border-border bg-white p-5 shadow-sm sm:grid-cols-2"
      >
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

        <div className="sm:col-span-2 space-y-2">
          <p className="text-sm font-medium text-ink">বিভাগ · জেলা · আদালতের ধরন · আদালত</p>
          <BdLocationFilters mode="entry" value={locationValue} onChange={onLocationChange} />
        </div>

        {match && (
          <div className="sm:col-span-2 rounded-xl border border-teal/30 bg-teal/5 px-4 py-3 text-sm">
            <p className="font-semibold text-ink">এই মামলা আগে এন্ট্রি আছে</p>
            <p className="mt-1 text-muted">
              {match.caseNumber} — {match.caseTitle || 'শিরোনাম নেই'}
            </p>
            <p className="mt-1 text-ink">
              বাদীপক্ষের উকিল: <strong>{match.plaintiffLawyerName || 'এখনো নেই'}</strong>
              {' · '}
              বিবাদীপক্ষের উকিল: <strong>{match.defendantLawyerName || 'এখনো নেই'}</strong>
            </p>
            {opposite && form.representingSide && (
              <p className="mt-2 font-medium text-teal">
                আপনি সেভ করলে {opposite.side}ের উকিল অটো থাকবে: {opposite.name}
              </p>
            )}
          </div>
        )}

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
        {error && <p className="sm:col-span-2 text-sm text-danger">{error}</p>}
        {info && <p className="sm:col-span-2 text-sm text-teal">{info}</p>}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'সংরক্ষণ হচ্ছে...' : mode === 'edit' ? 'Update Case' : 'Save Case'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          {saved && <span className="self-center text-sm text-success">সংরক্ষণ হয়েছে...</span>}
        </div>
      </form>
    </div>
  )
}
