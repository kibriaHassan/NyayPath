import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  BdLocationFilters,
  type BdLocationFilterValues,
} from '@/components/search/BdLocationFilters'
import { searchCases } from '@/data/mock'
import { api } from '@/lib/api'
import { COURT_TYPES } from '@/lib/bdLocations'
import { normalizeCaseNumber } from '@/lib/caseNumber'
import { cn } from '@/lib/utils'
import type { Case } from '@/types'

function locFromParams(params: URLSearchParams): BdLocationFilterValues {
  return {
    division: params.get('division') || '',
    district: params.get('district') || '',
    courtType: params.get('courtType') || '',
    court: params.get('court') || '',
  }
}

function filterSummary(loc: BdLocationFilterValues) {
  const parts = [loc.division, loc.district].filter(Boolean)
  if (loc.court) parts.push(loc.court)
  else if (loc.courtType) {
    const label = COURT_TYPES.find((t) => t.value === loc.courtType)?.label
    if (label) parts.push(label)
  }
  return parts.join(' · ')
}

export default function CaseSearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [caseNumber, setCaseNumber] = useState(params.get('q') || '')
  const [loc, setLoc] = useState<BdLocationFilterValues>(() => locFromParams(params))
  const [formError, setFormError] = useState('')
  const [results, setResults] = useState<Case[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const hasMinParams = Boolean(params.get('q') && params.get('division') && params.get('district'))

  useEffect(() => {
    setCaseNumber(params.get('q') || '')
    setLoc(locFromParams(params))
  }, [params])

  useEffect(() => {
    if (!hasMinParams) {
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }

    let cancelled = false
    const q = params.get('q') || ''
    const division = params.get('division') || ''
    const district = params.get('district') || ''
    const courtType = params.get('courtType') || ''
    const court = params.get('court') || ''

    setLoading(true)
    setSearched(true)

    const qs = new URLSearchParams({ q, division, district })
    if (courtType) qs.set('courtType', courtType)
    if (court) qs.set('court', court)

    api<{ data: Case[] }>(`/cases/search?${qs.toString()}`)
      .then((res) => {
        if (cancelled) return
        const list = res.data || []
        setResults(list)
        try {
          sessionStorage.setItem('nyaypath-public-cases', JSON.stringify(list))
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        if (cancelled) return
        const list = searchCases(q, { division, district, courtType, court })
        setResults(list)
        try {
          sessionStorage.setItem('nyaypath-public-cases', JSON.stringify(list))
        } catch {
          /* ignore */
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [params, hasMinParams])

  const activeSummary = useMemo(() => filterSummary(locFromParams(params)), [params])

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (!loc.division || !loc.district) {
      setFormError('সর্বনিম্ন বিভাগ ও জেলা নির্বাচন করুন।')
      return
    }
    if (!caseNumber.trim()) {
      setFormError('মামলা নম্বর লিখুন।')
      return
    }
    const num = normalizeCaseNumber(caseNumber)
    if (!num.ok) {
      setFormError(num.error)
      return
    }
    const next = new URLSearchParams()
    next.set('q', num.value)
    next.set('division', loc.division)
    next.set('district', loc.district)
    if (loc.courtType) next.set('courtType', loc.courtType)
    if (loc.court) next.set('court', loc.court)
    navigate(`/cases/search?${next.toString()}`)
  }

  return (
    <div className="container-page py-6 sm:py-10">
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">মামলা খুঁজুন</h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          বিভাগ ও জেলা দিয়ে সার্চ করুন — সেই নম্বরে যত মামলা আছে সব লিস্টে আসবে। আদালতের ধরন/আদালত দিলে আরও নির্দিষ্ট হবে।
        </p>
      </div>

      <form
        onSubmit={onSearch}
        className="mt-6 space-y-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:mt-8 sm:p-6"
      >
        <BdLocationFilters mode="search" value={loc} onChange={setLoc} />

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <Input
            label="মামলা নম্বর"
            placeholder="যেমন: 123/2026"
            value={caseNumber}
            onChange={(e) => setCaseNumber(e.target.value)}
            required
          />
          <Button type="submit" className="w-full md:w-auto" disabled={!loc.division || !loc.district}>
            <Search className="h-4 w-4" />
            মামলা খুঁজুন
          </Button>
        </div>

        {(!loc.division || !loc.district) && (
          <p className="text-sm text-muted">সার্চ করতে বিভাগ ও জেলা দুটোই নির্বাচন করতে হবে।</p>
        )}
        {formError && <p className="text-sm text-danger">{formError}</p>}
      </form>

      <div className="mt-8 space-y-3">
        {searched && (
          <div>
            <p className="text-sm font-medium text-ink">
              {loading ? 'খোঁজা হচ্ছে…' : `${results.length} টি মামলা পাওয়া গেছে`}
            </p>
            {activeSummary && (
              <p className="mt-0.5 text-xs text-muted">
                {params.get('q')} · {activeSummary}
              </p>
            )}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white px-4 py-12 text-center text-muted">
            <p>এই বিভাগ/জেলায় এই নম্বরে কোনো মামলা পাওয়া যায়নি।</p>
            <p className="mt-2 text-sm">
              উদাহরণ: বিভাগ <strong>ঢাকা</strong>, জেলা <strong>ঢাকা</strong>, নম্বর{' '}
              <strong>123/2026</strong>
            </p>
          </div>
        )}

        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {results.map((item) => (
            <li key={item.id}>
              <Link
                to={`/cases/${item.id}`}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-mist sm:px-5',
                )}
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-teal">{item.caseNumber}</p>
                  <p className="mt-1 text-sm text-ink">
                    <span className="text-muted">বাদী:</span> {item.plaintiff || '—'}
                    <span className="mx-2 text-border">|</span>
                    <span className="text-muted">বিবাদী:</span> {item.defendant || '—'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {[item.courtName, item.district || item.courtLocation].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
