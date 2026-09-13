import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { getLawyerById, searchCases } from '@/data/mock'
import { formatDate } from '@/lib/utils'
import type { Case, Lawyer } from '@/types'

function PublicLawyerBlock({
  title,
  lawyerId,
  fallbackName,
}: {
  title: string
  lawyerId?: string
  fallbackName?: string
}) {
  const lawyer = getLawyerById(lawyerId)
  const available = lawyer && lawyer.publicProfileEnabled

  if (!available) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-slate-panel p-4">
        <h4 className="font-semibold text-ink">{title}</h4>
        {fallbackName && !lawyerId && (
          <p className="mt-1 text-sm text-muted">{fallbackName}</p>
        )}
        <p className="mt-2 text-sm text-muted">
          Lawyer information is not available on this platform.
        </p>
      </div>
    )
  }

  return <LawyerPublicCard title={title} lawyer={lawyer} />
}

function LawyerPublicCard({ title, lawyer }: { title: string; lawyer: Lawyer }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
      <h4 className="font-semibold text-ink">{title}</h4>
      <div className="mt-3 flex items-start gap-3">
        <img src={lawyer.photo} alt="" className="h-14 w-14 rounded-full border border-border" />
        <div>
          <p className="font-display text-lg font-semibold">{lawyer.fullName}</p>
          <p className="text-sm text-muted">{lawyer.chamberName}</p>
          <p className="text-sm text-muted">{lawyer.practiceAreas.join(', ')}</p>
          {lawyer.visibility.mobile && (
            <p className="mt-1 text-sm text-ink">{lawyer.mobile}</p>
          )}
          {lawyer.visibility.email && (
            <p className="text-sm text-ink">{lawyer.email}</p>
          )}
        </div>
      </div>
      <Link to={`/lawyers/${lawyer.id}`} className="mt-4 inline-block">
        <Button variant="outline" size="sm">
          View Profile
        </Button>
      </Link>
    </div>
  )
}

function CaseResult({ item }: { item: Case }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-slate-panel">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal">{item.caseNumber}</p>
            <h3 className="font-display text-xl font-semibold">{item.caseTitle}</h3>
          </div>
          <Badge variant={statusBadgeVariant(item.status)}>{item.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="font-semibold">Case Information</h4>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div>
              <dt className="text-muted">Case Type</dt>
              <dd className="font-medium">{item.caseType}</dd>
            </div>
            <div>
              <dt className="text-muted">Court</dt>
              <dd className="font-medium">{item.courtName}</dd>
            </div>
            <div>
              <dt className="text-muted">Filing Date</dt>
              <dd className="font-medium">{formatDate(item.filingDate)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">Next Hearing Date</dt>
              <dd className="font-display text-xl font-semibold text-bronze">
                {formatDate(item.nextHearingDate)}
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="font-semibold">Parties</h4>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted">Plaintiff / বাদী</dt>
              <dd className="font-medium">{item.plaintiff}</dd>
            </div>
            <div>
              <dt className="text-muted">Defendant / বিবাদী</dt>
              <dd className="font-medium">{item.defendant}</dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 className="font-semibold">Lawyer Information</h4>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <PublicLawyerBlock
              title="Plaintiff Lawyer"
              lawyerId={item.plaintiffLawyerId}
              fallbackName={item.plaintiffLawyerName}
            />
            <PublicLawyerBlock
              title="Defendant Lawyer"
              lawyerId={item.defendantLawyerId}
              fallbackName={item.defendantLawyerName}
            />
          </div>
        </div>

        <p className="rounded-lg bg-sand/70 px-3 py-2 text-xs text-muted">
          প্রাইভেট নোট, স্টাফ তথ্য, অভ্যন্তরীণ ডকুমেন্ট ও ক্লায়েন্টের গোপনীয় তথ্য পাবলিক সার্চে দেখানো হয় না।
        </p>
      </CardContent>
    </Card>
  )
}

export default function CaseSearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [caseNumber, setCaseNumber] = useState(params.get('q') || '')
  const [court, setCourt] = useState(params.get('court') || '')
  const [submitted, setSubmitted] = useState(Boolean(params.get('q')))

  const results = useMemo(() => {
    if (!submitted || !params.get('q')) return []
    return searchCases(params.get('q') || '', params.get('court') || undefined)
  }, [params, submitted])

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const next = new URLSearchParams()
    if (caseNumber.trim()) next.set('q', caseNumber.trim())
    if (court.trim()) next.set('court', court.trim())
    setSubmitted(true)
    navigate(`/cases/search?${next.toString()}`)
  }

  return (
    <div className="container-page py-6 sm:py-10">
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Case Search</h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          মামলা নম্বর দিয়ে পরবর্তী তারিখ ও সংশ্লিষ্ট উকিলের পাবলিক তথ্য খুঁজুন।
        </p>
      </div>

      <form
        onSubmit={onSearch}
        className="mt-6 grid gap-3 rounded-xl border border-border bg-white p-4 shadow-sm sm:mt-8 sm:p-5 md:grid-cols-[1fr_1fr_auto]"
      >
        <Input
          label="Case Number"
          placeholder="যেমন: 123/2026"
          value={caseNumber}
          onChange={(e) => setCaseNumber(e.target.value)}
          required
        />
        <Input
          label="Court / District (ঐচ্ছিক)"
          placeholder="যেমন: ঢাকা"
          value={court}
          onChange={(e) => setCourt(e.target.value)}
        />
        <div className="flex items-end">
          <Button type="submit" className="w-full md:w-auto">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </form>

      <div className="mt-8 space-y-6">
        {submitted && results.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white px-4 py-12 text-center text-muted">
            কোনো মামলা পাওয়া যায়নি। উদাহরণ হিসেবে <strong>123/2026</strong> সার্চ করুন।
          </div>
        )}
        {results.map((item) => (
          <CaseResult key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
