import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Camera, CheckCircle2, MapPin, Building2, Scale, Pencil } from 'lucide-react'
import { getLawyerById, lawyers } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { SuggestInput } from '@/components/ui/SuggestInput'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { api } from '@/lib/api'
import { fileToCompressedDataUrl } from '@/lib/imageUpload'
import {
  findDivisionByDistrict,
  getAreasForDistrict,
  getCourtsForDistrict,
  getDistrictsByDivision,
  getDivisionNames,
} from '@/lib/bdLocations'
import {
  PRACTICE_TYPE_OPTIONS,
  buildMapQuery,
  googleMapsEmbedUrl,
  googleMapsOpenUrl,
  practiceAreasFromType,
  inferPracticeType,
  type PracticeType,
} from '@/lib/practiceTypes'
import { cn } from '@/lib/utils'
import type { Lawyer, PublicVisibility } from '@/types'

type FormState = {
  fullName: string
  email: string
  mobile: string
  designation: string
  barAssociation: string
  enrollmentNumber: string
  practiceType: PracticeType
  yearsOfExperience: number
  division: string
  district: string
  court: string
  chamberName: string
  chamberAddress: string
  chamberLocation: string
  bio: string
  photo: string
}

export default function LawyerProfilePage() {
  const user = useAuthStore((s) => s.user)
  const updateSessionUser = useAuthStore((s) => s.updateSessionUser)
  const lawyer = getLawyerById(user?.id)
  const fileRef = useRef<HTMLInputElement>(null)

  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const savedSnap = useRef<{
    form: FormState
    publicEnabled: boolean
    visibility: PublicVisibility
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [publicEnabled, setPublicEnabled] = useState(lawyer?.publicProfileEnabled ?? true)
  const [visibility, setVisibility] = useState<PublicVisibility>(
    lawyer?.visibility || {
      enrollmentNumber: true,
      mobile: true,
      email: true,
      chamberAddress: true,
      bio: true,
    },
  )

  const [form, setForm] = useState<FormState>(() => ({
    fullName: lawyer?.fullName || user?.name || '',
    email: lawyer?.email || user?.email || '',
    mobile: lawyer?.mobile || '',
    designation: lawyer?.designation || 'অ্যাডভোকেট',
    barAssociation: lawyer?.barAssociation || '',
    enrollmentNumber: lawyer?.enrollmentNumber || '',
    practiceType: lawyer?.practiceType || inferPracticeType(lawyer?.practiceAreas),
    yearsOfExperience: lawyer?.yearsOfExperience || 0,
    division: lawyer?.division || findDivisionByDistrict(lawyer?.district || '') || '',
    district: lawyer?.district || '',
    court: lawyer?.court || '',
    chamberName: lawyer?.chamberName || '',
    chamberAddress: lawyer?.chamberAddress || '',
    chamberLocation: lawyer?.chamberLocation || '',
    bio: lawyer?.bio || '',
    photo: lawyer?.photo || user?.photo || '',
  }))

  useEffect(() => {
    let cancelled = false
    api<{ data: Lawyer }>('/profile/lawyer')
      .then((res) => {
        if (cancelled || !res.data) return
        const l = res.data
        const nextPublic = l.publicProfileEnabled ?? true
        const nextVisibility = l.visibility || {
          enrollmentNumber: true,
          mobile: true,
          email: true,
          chamberAddress: true,
          bio: true,
        }
        const nextForm: FormState = {
          fullName: l.fullName || '',
          email: l.email || '',
          mobile: l.mobile || '',
          designation: l.designation || '',
          barAssociation: l.barAssociation || '',
          enrollmentNumber: l.enrollmentNumber || '',
          practiceType: l.practiceType || inferPracticeType(l.practiceAreas),
          yearsOfExperience: l.yearsOfExperience || 0,
          division: l.division || findDivisionByDistrict(l.district || '') || '',
          district: l.district || '',
          court: l.court || '',
          chamberName: l.chamberName || '',
          chamberAddress: l.chamberAddress || '',
          chamberLocation: l.chamberLocation || '',
          bio: l.bio || '',
          photo: l.photo || '',
        }
        setForm(nextForm)
        setPublicEnabled(nextPublic)
        setVisibility(nextVisibility)
        savedSnap.current = { form: nextForm, publicEnabled: nextPublic, visibility: nextVisibility }
      })
      .catch(() => {
        /* mock fallback already in state */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const districtOptions = useMemo(
    () => getDistrictsByDivision(form.division).map((d) => ({ value: d, label: d })),
    [form.division],
  )
  const courtSuggestions = useMemo(() => getCourtsForDistrict(form.district), [form.district])
  const areaSuggestions = useMemo(() => getAreasForDistrict(form.district), [form.district])
  const mapQuery = useMemo(
    () =>
      buildMapQuery({
        chamberAddress: form.chamberAddress,
        chamberLocation: form.chamberLocation,
        district: form.district,
        division: form.division,
      }),
    [form.chamberAddress, form.chamberLocation, form.district, form.division],
  )
  const mapEmbed = googleMapsEmbedUrl(mapQuery)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const onPhotoPick = async (file: File | null) => {
    if (!file) return
    setPhotoError('')
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      set('photo', dataUrl)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'ছবি আপলোড ব্যর্থ')
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      fullName: form.fullName.trim(),
      mobile: form.mobile.trim(),
      designation: form.designation.trim(),
      barAssociation: form.barAssociation.trim(),
      enrollmentNumber: form.enrollmentNumber.trim(),
      practiceType: form.practiceType,
      practiceAreas: practiceAreasFromType(form.practiceType),
      yearsOfExperience: Number(form.yearsOfExperience) || 0,
      division: form.division,
      district: form.district,
      court: form.court.trim(),
      chamberName: form.chamberName.trim(),
      chamberAddress: form.chamberAddress.trim(),
      chamberLocation: form.chamberLocation.trim(),
      bio: form.bio.trim(),
      photo: form.photo,
      publicProfileEnabled: publicEnabled,
      visibility,
    }

    // update local mock for offline mode
    const idx = lawyers.findIndex((l) => l.id === user?.id)
    if (idx >= 0) {
      lawyers[idx] = { ...lawyers[idx], ...payload, email: lawyers[idx].email }
    }

    updateSessionUser({
      name: payload.fullName,
      photo: payload.photo,
    })

    try {
      await api('/profile/lawyer', { method: 'PUT', body: payload })
      setSaved(true)
      setEditing(false)
    } catch {
      // mock already saved locally
      setSaved(true)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const startEdit = () => {
    savedSnap.current = {
      form: { ...form },
      publicEnabled,
      visibility: { ...visibility },
    }
    setSaved(false)
    setError('')
    setEditing(true)
  }

  const cancelEdit = () => {
    const snap = savedSnap.current
    if (snap) {
      setForm(snap.form)
      setPublicEnabled(snap.publicEnabled)
      setVisibility(snap.visibility)
    }
    setError('')
    setPhotoError('')
    setEditing(false)
  }

  if (!lawyer && !user) return null

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold md:text-3xl">My Profile</h1>
          <p className="text-sm text-muted">
            {editing ? 'তথ্য বদলে সেভ করুন' : 'তথ্য দেখুন। আপডেট করতে তথ্য পরিবর্তন চাপুন।'}
          </p>
        </div>
        {!editing ? (
          <Button type="button" onClick={startEdit} className="rounded-xl">
            <Pencil className="h-4 w-4" />
            তথ্য পরিবর্তন
          </Button>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <form onSubmit={onSubmit} className="space-y-5">
          <fieldset disabled={!editing} className="m-0 min-w-0 space-y-5 border-0 p-0 disabled:opacity-100">
          {/* Photo */}
          <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <Camera className="h-4 w-4 text-teal" />
              <h2 className="font-display text-lg font-semibold">প্রোফাইল ছবি</h2>
            </div>
            <div className="flex flex-wrap items-center gap-5">
              <div className="relative">
                <img
                  src={form.photo || 'https://api.dicebear.com/9.x/initials/svg?seed=NP&backgroundColor=0c2e33'}
                  alt=""
                  className="h-24 w-24 rounded-2xl border border-border object-cover shadow-sm"
                />
                {lawyer?.verified && (
                  <span className="absolute -bottom-2 -right-2">
                    <Badge variant="success">Verified</Badge>
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onPhotoPick(e.target.files?.[0] || null)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                    ছবি বাছাই / পরিবর্তন
                  </Button>
                  {form.photo && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        set(
                          'photo',
                          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(form.fullName || 'NP')}&backgroundColor=0c2e33`,
                        )
                      }
                    >
                      ডিফল্ট ছবি
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted">JPG/PNG · সর্বোচ্চ ~৬ MB · অটো কম্প্রেস হবে</p>
                {photoError && <p className="text-xs text-danger">{photoError}</p>}
              </div>
            </div>
          </section>

          {/* Basic */}
          <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
            <h2 className="mb-4 font-display text-lg font-semibold">মূল তথ্য</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="পূর্ণ নাম" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} required />
              <Input label="ইমেইল" value={form.email} disabled hint="ইমেইল পরিবর্তন করা যায় না" />
              <Input label="মোবাইল" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
              <Input label="পদবি" value={form.designation} onChange={(e) => set('designation', e.target.value)} />
              <Input
                label="বার অ্যাসোসিয়েশন"
                value={form.barAssociation}
                onChange={(e) => set('barAssociation', e.target.value)}
              />
              <Input
                label="এনরোলমেন্ট নম্বর"
                value={form.enrollmentNumber}
                onChange={(e) => set('enrollmentNumber', e.target.value)}
              />
              <Input
                label="অভিজ্ঞতা (বছর)"
                type="number"
                min={0}
                value={form.yearsOfExperience}
                onChange={(e) => set('yearsOfExperience', Number(e.target.value))}
              />
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium text-ink">কী ধরনের মামলা করেন?</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {PRACTICE_TYPE_OPTIONS.map((opt) => {
                    const active = form.practiceType === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('practiceType', opt.value)}
                        className={cn(
                          'rounded-xl border px-3 py-3 text-left transition',
                          active
                            ? 'border-teal bg-teal text-white shadow-sm'
                            : 'border-border bg-slate-panel/60 text-ink hover:border-teal/40',
                        )}
                      >
                        <span className="block text-sm font-semibold">{opt.label}</span>
                        <span className={cn('mt-0.5 block text-[11px]', active ? 'text-white/80' : 'text-muted')}>
                          {opt.hint}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Textarea label="বায়ো" value={form.bio} onChange={(e) => set('bio', e.target.value)} rows={3} />
              </div>
            </div>
          </section>

          {/* Location & courts */}
          <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <Scale className="h-4 w-4 text-teal" />
              <h2 className="font-display text-lg font-semibold">বিভাগ · জেলা · আদালত</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="বিভাগ"
                placeholder="বিভাগ নির্বাচন করুন"
                value={form.division}
                options={getDivisionNames().map((n) => ({ value: n, label: n }))}
                onChange={(e) => {
                  const division = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    division,
                    district: '',
                    court: '',
                    chamberLocation: '',
                  }))
                  setSaved(false)
                }}
              />
              <Select
                label="জেলা"
                placeholder={form.division ? 'জেলা নির্বাচন করুন' : 'আগে বিভাগ দিন'}
                value={form.district}
                disabled={!form.division}
                options={districtOptions}
                onChange={(e) => {
                  const district = e.target.value
                  setForm((prev) => ({
                    ...prev,
                    district,
                    court: '',
                    chamberLocation: '',
                  }))
                  setSaved(false)
                }}
              />
              <div className="sm:col-span-2">
                <SuggestInput
                  label="আদালত / কোর্ট"
                  value={form.court}
                  onChange={(v) => set('court', v)}
                  suggestions={courtSuggestions}
                  disabled={!form.district}
                  placeholder={form.district ? 'টাইপ করুন বা সাজেশন থেকে বাছুন' : 'আগে জেলা নির্বাচন করুন'}
                  hint="জেলা অনুযায়ী আদালতের নাম সাজেস্ট হবে"
                />
              </div>
            </div>
          </section>

          {/* Chamber */}
          <section className="rounded-2xl border border-border/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-bronze" />
              <h2 className="font-display text-lg font-semibold">পার্সোনাল চেম্বার</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="চেম্বারের নাম"
                value={form.chamberName}
                onChange={(e) => set('chamberName', e.target.value)}
              />
              <SuggestInput
                label="লোকেশন / এলাকা"
                value={form.chamberLocation}
                onChange={(v) => set('chamberLocation', v)}
                suggestions={areaSuggestions}
                disabled={!form.district}
                placeholder={form.district ? 'যেমন: গুলশান, কোর্ট এলাকা' : 'আগে জেলা দিন'}
                hint="জেলা অনুযায়ী এলাকার সাজেশন"
              />
              <div className="sm:col-span-2">
                <Input
                  label="চেম্বারের সম্পূর্ণ ঠিকানা (ম্যাপের জন্য)"
                  value={form.chamberAddress}
                  onChange={(e) => set('chamberAddress', e.target.value)}
                  placeholder="রুম নং, বিল্ডিং, রোড, এলাকা — নিজে লিখুন"
                  hint="ঠিকানা দিলে নিচে ম্যাপে দেখাবে"
                />
              </div>
              {(form.chamberLocation || form.district) && (
                <p className="sm:col-span-2 inline-flex items-start gap-2 rounded-xl bg-mist/80 px-3 py-2 text-xs text-muted">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                  {[form.chamberLocation, form.district, form.division].filter(Boolean).join(' · ')}
                </p>
              )}
              {mapEmbed && (
                <div className="sm:col-span-2 overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-slate-panel/60 px-3 py-2">
                    <p className="text-xs font-semibold text-ink">ম্যাপে লোকেশন</p>
                    <a
                      href={googleMapsOpenUrl(mapQuery)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#2563eb] hover:underline"
                    >
                      Google Maps এ খুলুন →
                    </a>
                  </div>
                  <iframe
                    title="Chamber map"
                    src={mapEmbed}
                    className="h-56 w-full border-0 sm:h-64"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              )}
            </div>
          </section>

          {error && <p className="text-sm text-danger">{error}</p>}

          </fieldset>
          {editing ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saving} className="rounded-xl">
                {saving ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল সেভ করুন'}
              </Button>
              <Button type="button" variant="outline" className="rounded-xl" onClick={cancelEdit} disabled={saving}>
                বাতিল
              </Button>
            </div>
          ) : null}
          {saved && !editing && (
            <span className="pointer-events-none inline-flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              সংরক্ষণ হয়েছে
            </span>
          )}
        </form>

        <div className="space-y-4">
          <Card className={cn('rounded-2xl', !editing && 'pointer-events-none')}>
            <CardHeader>
              <h2 className="font-semibold">পাবলিক প্রোফাইল</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <label className="flex items-center justify-between gap-3">
                <span>পাবলিক প্রোফাইল চালু</span>
                <input
                  type="checkbox"
                  disabled={!editing}
                  checked={publicEnabled}
                  onChange={(e) => {
                    setPublicEnabled(e.target.checked)
                    setSaved(false)
                  }}
                />
              </label>
              <p className="rounded-lg bg-teal/5 px-2.5 py-2 text-xs text-muted">
                চালু থাকলে ল্যান্ডিং পেজ ও উকিল সার্চে আপনার প্রোফাইল দেখা যাবে।
              </p>
              {(Object.keys(visibility) as (keyof PublicVisibility)[]).map((key) => (
                <label key={key} className="flex items-center justify-between gap-3">
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <input
                    type="checkbox"
                    disabled={!editing}
                    checked={visibility[key]}
                    onChange={(e) => {
                      setVisibility((v) => ({ ...v, [key]: e.target.checked }))
                      setSaved(false)
                    }}
                  />
                </label>
              ))}
              <p className="text-xs text-muted">ডিরেক্টরিতে শুধু চালু ফিল্ড দেখা যাবে।</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-panel/50">
              <h2 className="font-semibold">প্রিভিউ</h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <img src={form.photo} alt="" className="h-12 w-12 rounded-xl object-cover border border-border" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{form.fullName || '—'}</p>
                  <p className="truncate text-xs text-muted">{form.designation}</p>
                </div>
              </div>
              <p className="text-xs text-muted">
                {[form.court, form.district].filter(Boolean).join(' · ') || 'আদালত/জেলা নেই'}
              </p>
              <p className="text-xs text-muted">
                {[form.chamberName, form.chamberLocation].filter(Boolean).join(' — ') || 'চেম্বার তথ্য নেই'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
