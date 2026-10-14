import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin } from 'lucide-react'
import { getCaseById, getLawyerById } from '@/data/mock'
import { api } from '@/lib/api'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { dateKeyFromValue } from '@/lib/courtCalendar'
import { formatDate } from '@/lib/utils'
import type { Case, Lawyer } from '@/types'

type PublicHearing = {
  id?: string
  hearingDate?: string
  hearingTime?: string
  hearingType?: string
  court?: string
}

type PublicCase = Case & { hearings?: PublicHearing[] }

function LawyerBlock({
  title,
  lawyerId,
  fallbackName,
}: {
  title: string
  lawyerId?: string
  fallbackName?: string
}) {
  const [lawyer, setLawyer] = useState<Lawyer | undefined>(() => getLawyerById(lawyerId))

  useEffect(() => {
    if (!lawyerId) return
    api<{ data: Lawyer }>(`/lawyers/${lawyerId}`)
      .then((res) => setLawyer(res.data))
      .catch(() => setLawyer(getLawyerById(lawyerId)))
  }, [lawyerId])

  if (lawyer?.publicProfileEnabled) {
    return (
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <h4 className="font-semibold text-ink">{title}</h4>
        <div className="mt-3 flex items-start gap-3">
          <img src={lawyer.photo} alt="" className="h-12 w-12 rounded-full border border-border" />
          <div>
            <p className="font-display text-lg font-semibold">{lawyer.fullName}</p>
            <p className="text-sm text-muted">{lawyer.chamberName}</p>
            {lawyer.visibility.mobile && <p className="mt-1 text-sm">{lawyer.mobile}</p>}
          </div>
        </div>
        <Link to={`/lawyers/${lawyer.id}`} className="mt-3 inline-block">
          <Button variant="outline" size="sm">
            প্রোফাইল দেখুন
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-slate-panel p-4">
      <h4 className="font-semibold text-ink">{title}</h4>
      <p className="mt-2 text-sm text-muted">{fallbackName || 'তথ্য পাওয়া যায়নি'}</p>
    </div>
  )
}

export default function PublicCaseDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState<PublicCase | null>(() => getCaseById(id) || null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    api<{ data: PublicCase }>(`/cases/search/detail/${id}`)
      .then((res) => {
        if (!cancelled) setItem(res.data)
      })
      .catch(() => {
        if (cancelled) return
        let fromCache: PublicCase | null = null
        try {
          const raw = sessionStorage.getItem('nyaypath-public-cases')
          const list = raw ? (JSON.parse(raw) as PublicCase[]) : []
          fromCache = list.find((c) => c.id === id) || null
        } catch {
          fromCache = null
        }
        setItem(fromCache || getCaseById(id) || null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const dateTimeline = useMemo(() => {
    if (!item) return [] as { key: string; date: string; title: string; detail?: string; tone: string }[]
    const rows: { key: string; date: string; title: string; detail?: string; tone: string }[] = []
    const filing = dateKeyFromValue(item.filingDate)
    if (filing) {
      rows.push({ key: `filing-${filing}`, date: filing, title: 'মামলা দাখিল', tone: 'start' })
    }
    const seen = new Set(filing ? [filing] : [])
    for (const h of [...(item.hearings || [])].sort((a, b) =>
      String(a.hearingDate || '').localeCompare(String(b.hearingDate || '')),
    )) {
      const day = dateKeyFromValue(h.hearingDate)
      if (!day || seen.has(day)) continue
      seen.add(day)
      rows.push({
        key: h.id || `h-${day}`,
        date: day,
        title: h.hearingType || 'শুনানি',
        detail: [h.hearingTime, h.court].filter(Boolean).join(' · '),
        tone: 'past',
      })
    }
    const next = dateKeyFromValue(item.nextHearingDate)
    if (next && !seen.has(next)) {
      rows.push({
        key: `next-${next}`,
        date: next,
        title: item.nextHearingPurpose || 'পরবর্তী শুনানি',
        detail: 'পরবর্তী নির্ধারিত তারিখ',
        tone: 'next',
      })
    }
    return rows.sort((a, b) => a.date.localeCompare(b.date))
  }, [item])

  if (loading) return <p className="container-page py-10 text-muted">লোড হচ্ছে…</p>
  if (!item) {
    return (
      <div className="container-page py-10 space-y-3">
        <p className="text-muted">মামলা পাওয়া যায়নি।</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          ফিরে যান
        </Button>
      </div>
    )
  }

  return (
    <div className="container-page py-6 sm:py-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        সার্চ ফলাফলে ফিরে যান
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal">{item.caseNumber}</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{item.caseTitle}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <MapPin className="h-3.5 w-3.5" />
            {[item.courtName, item.district || item.courtLocation, item.division]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
            <Badge variant="muted">{item.caseType}</Badge>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-semibold">মামলার তথ্য</h2>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                ['বাদী', item.plaintiff],
                ['বিবাদী', item.defendant],
                ['আদালত', item.courtName],
                ['লোকেশন', [item.district || item.courtLocation, item.division].filter(Boolean).join(', ')],
                ['ফাইলিং তারিখ', formatDate(item.filingDate)],
                ['পরবর্তী শুনানি', formatDate(item.nextHearingDate)],
                ['বিচারক', item.judgeName || '—'],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {item.description && (
              <div className="mt-4">
                <p className="text-sm text-muted">বিবরণ</p>
                <p className="mt-1 text-sm leading-relaxed">{item.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">পরবর্তী তারিখ</h2>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl font-semibold text-bronze">
              {formatDate(item.nextHearingDate)}
            </p>
            {item.nextHearingPurpose ? (
              <p className="mt-1 text-sm font-medium text-ink">{item.nextHearingPurpose}</p>
            ) : null}
            <p className="mt-2 text-sm text-muted">প্রাইভেট নোট ও অভ্যন্তরীণ তথ্য দেখানো হয় না।</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-semibold">সব শুনানির তারিখ</h2>
          <p className="mt-1 text-xs text-muted">পুরোনো তারিখ উপরে · নতুন তারিখ নিচে</p>
        </CardHeader>
        <CardContent>
          {dateTimeline.length === 0 ? (
            <p className="text-sm text-muted">কোনো তারিখ নেই।</p>
          ) : (
            <ol className="space-y-0">
              {dateTimeline.map((row, i) => (
                <li key={row.key} className="relative flex gap-3 pb-4 last:pb-0">
                  <span className="relative z-10 mt-1.5 flex h-2.5 w-2.5 shrink-0 rounded-full bg-teal ring-4 ring-teal/15" />
                  {i < dateTimeline.length - 1 ? (
                    <span className="absolute left-[4.5px] top-5 bottom-0 w-px bg-border" />
                  ) : null}
                  <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-slate-panel/30 px-3 py-2.5">
                    <p className="text-sm font-bold text-ink">{formatDate(row.date)}</p>
                    <p className="mt-0.5 text-sm text-ink">{row.title}</p>
                    {row.detail ? <p className="mt-0.5 text-xs text-muted">{row.detail}</p> : null}
                    {row.tone === 'start' ? (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-teal">দাখিল</p>
                    ) : null}
                    {row.tone === 'next' ? (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        পরবর্তী
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <LawyerBlock
          title="বাদীপক্ষের উকিল"
          lawyerId={item.plaintiffLawyerId}
          fallbackName={item.plaintiffLawyerName}
        />
        <LawyerBlock
          title="বিবাদীপক্ষের উকিল"
          lawyerId={item.defendantLawyerId}
          fallbackName={item.defendantLawyerName}
        />
      </div>
    </div>
  )
}
