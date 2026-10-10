import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  FolderLock,
  Search,
  ShieldCheck,
  Users,
  Scale,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LawyerCard } from '@/components/lawyers/LawyerCard'
import {
  BdLocationFilters,
  type BdLocationFilterValues,
} from '@/components/search/BdLocationFilters'
import { filterLawyersByPracticeType } from '@/data/mock'
import { findDivisionByDistrict, matchesCourtType } from '@/lib/bdLocations'
import { loadPublicLawyers } from '@/lib/publicLawyers'
import { normalizeCaseNumber, toAsciiCaseNumberInput } from '@/lib/caseNumber'
import { PRACTICE_TYPE_OPTIONS, type PracticeType } from '@/lib/practiceTypes'
import { useLandingLang } from '@/lib/landingLang'
import { cn } from '@/lib/utils'
import type { Lawyer } from '@/types'

const emptyLocation: BdLocationFilterValues = {
  division: '',
  district: '',
  courtType: '',
  court: '',
}

function matchesLawyerLocation(lawyer: Lawyer, loc: BdLocationFilterValues) {
  const lawyerDivision = lawyer.division || findDivisionByDistrict(lawyer.district || '')
  if (loc.division && lawyerDivision !== loc.division) return false
  if (loc.district && lawyer.district !== loc.district) return false
  if (loc.court && lawyer.court !== loc.court) return false
  if (loc.courtType && !loc.court && !matchesCourtType(lawyer.court, loc.courtType)) return false
  return true
}

export default function LandingPage() {
  const navigate = useNavigate()
  const { lang, t, courtTypeLabel } = useLandingLang()
  const placeLabels = {
    division: t('division'),
    district: t('district'),
    courtType: t('courtType'),
    court: t('court'),
    pickDivision: t('pickDivision'),
    pickDistrict: t('pickDistrict'),
    divisionFirst: t('divisionFirst'),
    pickType: t('pickType'),
    districtFirst: t('districtFirst'),
    pickCourt: t('pickCourt'),
    noCourt: t('noCourt'),
  }
  const features = [
    { icon: Search, title: lang === 'bn' ? 'সহজে মামলা খুঁজে পাওয়া' : 'Find a case easily', desc: lang === 'bn' ? 'মামলা নম্বর দিয়ে পরবর্তী তারিখ ও মৌলিক তথ্য দেখুন।' : 'Use the case number to see the next date and basic details.', tint: 'bg-[#e7f4f1] text-[#2b6b62]' },
    { icon: CalendarDays, title: lang === 'bn' ? 'পরবর্তী তারিখ' : 'Next hearing date', desc: lang === 'bn' ? 'পরবর্তী শুনানির তারিখ এক নজরে।' : 'See the next hearing date at a glance.', tint: 'bg-[#f8efe4] text-[#8a6238]' },
    { icon: Scale, title: lang === 'bn' ? 'উকিল ডিরেক্টরি' : 'Lawyer directory', desc: lang === 'bn' ? 'রেজিস্টার্ড উকিলদের পাবলিক প্রোফাইল।' : 'Public profiles of registered lawyers.', tint: 'bg-[#eef1f8] text-[#3d5278]' },
    { icon: Users, title: lang === 'bn' ? 'স্টাফ ব্যবস্থাপনা' : 'Staff management', desc: lang === 'bn' ? 'স্টাফ যোগ, মামলা অ্যাসাইন ও পারমিশন।' : 'Add staff, assign cases, and set permissions.', tint: 'bg-[#f3eef6] text-[#6a4d78]' },
    { icon: FolderLock, title: lang === 'bn' ? 'মামলা পরিচালনা' : 'Case management', desc: lang === 'bn' ? 'মামলা, ডকুমেন্ট, টাস্ক ও নোট এক জায়গায়।' : 'Cases, documents, tasks, and notes in one place.', tint: 'bg-[#eef6f2] text-[#35685a]' },
    { icon: ShieldCheck, title: lang === 'bn' ? 'নিরাপদ তথ্য' : 'Private information', desc: lang === 'bn' ? 'প্রাইভেট নোট শুধু অনুমোদিত ব্যবহারকারী দেখেন।' : 'Private notes stay with the people who are allowed to see them.', tint: 'bg-[#f7f1ea] text-[#7a5b45]' },
  ]
  const steps = [
    { n: lang === 'bn' ? '১' : '1', title: lang === 'bn' ? 'বিভাগ, জেলা ও নম্বর দিন' : 'Enter division, district, and number', desc: lang === 'bn' ? 'আদালতের ধরন দিলে ফলাফল আরও নির্দিষ্ট হয়।' : 'A court type makes the result more specific.' },
    { n: lang === 'bn' ? '২' : '2', title: lang === 'bn' ? 'মামলার তথ্য দেখুন' : 'Read the case', desc: lang === 'bn' ? 'স্ট্যাটাস, পক্ষ ও মৌলিক তথ্য।' : 'Status, parties, and the basic record.' },
    { n: lang === 'bn' ? '৩' : '3', title: lang === 'bn' ? 'তারিখ ও উকিল দেখুন' : 'See the date and lawyer', desc: lang === 'bn' ? 'পরবর্তী শুনানি ও উকিলের প্রোফাইল।' : 'The next hearing and the lawyer profile.' },
  ]
  const [caseNumber, setCaseNumber] = useState('')
  const [caseLoc, setCaseLoc] = useState<BdLocationFilterValues>(emptyLocation)
  const [caseSearchError, setCaseSearchError] = useState('')
  const [practiceFilter, setPracticeFilter] = useState<PracticeType | ''>('')
  const [lawyerName, setLawyerName] = useState('')
  const [lawyerLoc, setLawyerLoc] = useState<BdLocationFilterValues>(emptyLocation)
  const [publicLawyers, setPublicLawyers] = useState<Lawyer[]>([])
  const [loadingLawyers, setLoadingLawyers] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingLawyers(true)
    loadPublicLawyers()
      .then((list) => {
        if (!cancelled) setPublicLawyers(list)
      })
      .finally(() => {
        if (!cancelled) setLoadingLawyers(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredLawyers = useMemo(() => {
    let list = filterLawyersByPracticeType(publicLawyers, practiceFilter)
    list = list.filter((l) => matchesLawyerLocation(l, lawyerLoc))
    if (lawyerName.trim()) {
      const q = lawyerName.trim().toLowerCase()
      list = list.filter((l) => l.fullName.toLowerCase().includes(q))
    }
    return list
  }, [publicLawyers, practiceFilter, lawyerName, lawyerLoc])

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    setCaseSearchError('')
    if (!caseLoc.division || !caseLoc.district) {
      setCaseSearchError(t('needDivision'))
      return
    }
    if (!caseNumber.trim()) {
      setCaseSearchError(t('needNumber'))
      return
    }
    const num = normalizeCaseNumber(caseNumber)
    if (!num.ok) {
      setCaseSearchError(num.error)
      return
    }
    const params = new URLSearchParams()
    params.set('q', num.value)
    params.set('division', caseLoc.division)
    params.set('district', caseLoc.district)
    if (caseLoc.courtType) params.set('courtType', caseLoc.courtType)
    if (caseLoc.court) params.set('court', caseLoc.court)
    navigate(`/cases/search?${params.toString()}`)
  }

  return (
    <div className="bg-[#f7f4ef]">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#f4f8f6_0%,#f7f4ef_48%,#f8efe6_100%)]" />
        <div className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-[#d7ebe4]/70 blur-2xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[#f3ddc8]/80 blur-2xl" />
        <div className="container-page relative grid gap-8 py-10 sm:gap-10 sm:py-16 lg:grid-cols-[1fr_1.12fr] lg:items-center lg:py-20">
          <div>
            <p className="inline-flex rounded-full bg-white/80 px-3 py-1 text-xs font-semibold tracking-wide text-[#3d6f68] shadow-sm">
              {t('heroKicker')}
            </p>
            <h1 className="mt-4 max-w-xl font-display text-3xl font-semibold leading-tight text-[#243833] sm:text-5xl">
              {t('heroTitle')}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#5d6d68] sm:text-lg">{t('heroText')}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="w-full bg-[#3d7a72] hover:bg-[#326861] sm:w-auto" onClick={() => navigate('/cases/search')}>
                {t('searchCases')}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-[#d7c7b4] bg-white text-[#5c4632] hover:bg-[#fbf7f2] sm:w-auto"
                onClick={() => navigate('/lawyers')}
              >
                {t('searchLawyers')}
              </Button>
            </div>
          </div>

          <form
            onSubmit={onSearch}
            className="rounded-[28px] border border-[#e6ddd2] bg-white/95 p-4 shadow-[0_18px_50px_rgba(80,60,40,0.08)] sm:p-6"
          >
            <div className="flex items-center gap-2 text-[#243833]">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#e7f4f1] text-[#2b6b62]">
                <Search className="h-4 w-4" />
              </span>
              <h2 className="font-display text-xl font-semibold">{t('searchTitle')}</h2>
            </div>
            <p className="mt-2 text-sm text-[#6b7a76]">{t('searchHint')}</p>
            <div className="mt-5 space-y-4">
              <BdLocationFilters
                mode="search"
                value={caseLoc}
                onChange={setCaseLoc}
                tone="hero"
                labels={placeLabels}
                courtTypeLabel={courtTypeLabel}
              />
              <Input
                label={t('caseNumber')}
                placeholder={t('caseNumberPh')}
                value={caseNumber}
                onChange={(e) => setCaseNumber(toAsciiCaseNumberInput(e.target.value))}
                onBlur={() => {
                  const n = normalizeCaseNumber(caseNumber)
                  if (n.ok) setCaseNumber(n.value)
                }}
                inputMode="text"
                autoComplete="off"
                required
              />
              <p className="text-xs text-[#7b8884]">{t('caseFormat')}</p>
              {caseSearchError && <p className="text-sm text-danger">{caseSearchError}</p>}
              <Button
                type="submit"
                fullWidth
                size="lg"
                className="bg-[#3d7a72] hover:bg-[#326861]"
                disabled={!caseLoc.division || !caseLoc.district}
              >
                {t('searchCases')}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t('searchCases'), to: '/cases/search', wash: 'bg-[#eef7f4]' },
            { label: t('searchLawyers'), to: '/lawyers', wash: 'bg-[#f8f1e8]' },
            { label: t('lawyerRegisterShort'), to: '/register', wash: 'bg-[#f3f0f8]' },
            { label: t('login'), to: '/login', wash: 'bg-[#f4f6f5]' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'group flex min-h-14 items-center justify-between gap-3 rounded-[22px] border border-[#eadfd3] px-4 py-3.5 text-sm font-semibold text-[#243833] transition hover:-translate-y-0.5 hover:shadow-md',
                item.wash,
              )}
            >
              <span className="min-w-0 break-words">{item.label}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[#8a7564] transition group-hover:translate-x-0.5 group-hover:text-[#3d7a72]" />
            </Link>
          ))}
        </div>
      </section>

      <section className="py-10 sm:py-16">
        <div className="container-page">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#243833] sm:text-3xl">{t('lawyersTitle')}</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#667670] sm:text-base">{t('lawyersHint')}</p>
          </div>

          <div className="mt-6 rounded-[28px] border border-[#eadfd3] bg-white p-4 shadow-sm sm:p-5">
            <BdLocationFilters value={lawyerLoc} onChange={setLawyerLoc} labels={placeLabels} courtTypeLabel={courtTypeLabel} />

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-[#243833]">{t('caseKind')}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPracticeFilter('')}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-sm font-semibold transition',
                    practiceFilter === ''
                      ? 'bg-[#3d7a72] text-white shadow-sm'
                      : 'border border-[#eadfd3] bg-[#fbf8f4] text-[#243833] hover:border-[#3d7a72]/40',
                  )}
                >
                  {t('allLawyers')}
                </button>
                {PRACTICE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPracticeFilter(opt.value)}
                    className={cn(
                      'rounded-full px-3.5 py-2 text-sm font-semibold transition',
                      practiceFilter === opt.value
                        ? 'bg-[#3d7a72] text-white shadow-sm'
                        : 'border border-[#eadfd3] bg-[#fbf8f4] text-[#243833] hover:border-[#3d7a72]/40',
                    )}
                  >
                    {opt.value === 'civil' ? t('civil') : opt.value === 'criminal' ? t('criminal') : t('both')}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 max-w-md">
              <Input
                label={t('nameSearch')}
                value={lawyerName}
                onChange={(e) => setLawyerName(e.target.value)}
                placeholder={t('namePh')}
              />
            </div>
          </div>

          <p className="mt-5 text-sm text-muted">
            {loadingLawyers ? t('loading') : `${filteredLawyers.length} ${t('lawyerCount')}`}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {!loadingLawyers && filteredLawyers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted md:col-span-2 lg:col-span-3">
                {t('noLawyers')}
              </p>
            ) : (
              filteredLawyers.map((lawyer) => (
                <LawyerCard
                  key={lawyer.id}
                  lawyer={lawyer}
                  yearsLabel={t('years')}
                  profileLabel={t('viewProfile')}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-8 pb-12 sm:pb-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-semibold text-[#243833] sm:text-3xl">{t('whyTitle')}</h2>
          <p className="mt-2 text-[#667670]">{t('whyText')}</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-[24px] border border-[#eadfd3] bg-white p-5 shadow-sm">
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', f.tint)}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-[#243833]">{f.title}</h3>
              <p className="mt-2 text-sm text-[#667670]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-10 sm:py-16">
        <h2 className="font-display text-2xl font-semibold text-[#243833] sm:text-3xl">{t('howTitle')}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-[24px] border border-[#eadfd3] bg-white p-6 shadow-sm">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8efe4] font-display text-2xl font-semibold text-[#8a6238]">
                {s.n}
              </span>
              <h3 className="mt-4 font-semibold text-[#243833]">{s.title}</h3>
              <p className="mt-2 text-sm text-[#667670]">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-start gap-3 rounded-[22px] border border-[#ead3bc] bg-[#fbf6f0] p-4 text-sm text-[#3d342c]">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#8a6238]" />
          <p>{t('disclaimer')}</p>
        </div>
      </section>
    </div>
  )
}
