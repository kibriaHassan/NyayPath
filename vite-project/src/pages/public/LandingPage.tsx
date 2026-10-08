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
import { cn } from '@/lib/utils'
import type { Lawyer } from '@/types'

const emptyLocation: BdLocationFilterValues = {
  division: '',
  district: '',
  courtType: '',
  court: '',
}

const features = [
  {
    icon: Search,
    title: 'সহজে মামলা খুঁজে পাওয়া',
    desc: 'মামলা নম্বর দিয়ে দ্রুত পরবর্তী তারিখ ও মৌলিক তথ্য দেখুন।',
  },
  {
    icon: CalendarDays,
    title: 'মামলার পরবর্তী তারিখ',
    desc: 'পরবর্তী শুনানির তারিখ এক নজরে — কোনো জটিলতা ছাড়াই।',
  },
  {
    icon: Scale,
    title: 'Lawyer Directory',
    desc: 'রেজিস্টার্ড উকিলদের পাবলিক প্রোফাইল ও যোগাযোগের তথ্য।',
  },
  {
    icon: Users,
    title: 'Staff Management',
    desc: 'উকিলরা স্টাফ অ্যাড করে মামলা অ্যাসাইন ও পারমিশন নিয়ন্ত্রণ করতে পারেন।',
  },
  {
    icon: FolderLock,
    title: 'Case Management',
    desc: 'মামলা, ডকুমেন্ট, টাস্ক ও নোট এক ড্যাশবোর্ডে পরিচালনা করুন।',
  },
  {
    icon: ShieldCheck,
    title: 'Secure Information',
    desc: 'প্রাইভেট নোট ও অভ্যন্তরীণ তথ্য শুধুমাত্র অনুমোদিত ব্যবহারকারীদের জন্য।',
  },
]

const steps = [
  { n: '১', title: 'বিভাগ · জেলা · মামলা নম্বর দিন', desc: 'আদালতের ধরন/আদালত দিলে আরও নির্দিষ্ট ফলাফল পাবেন।' },
  { n: '২', title: 'মামলার তথ্য দেখুন', desc: 'স্ট্যাটাস, পক্ষ ও মৌলিক তথ্য দেখুন।' },
  { n: '৩', title: 'পরবর্তী তারিখ ও Lawyer দেখুন', desc: 'নেক্সট হেয়ারিং এবং সংশ্লিষ্ট উকিলের প্রোফাইল।' },
]

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
      setCaseSearchError('সর্বনিম্ন বিভাগ ও জেলা নির্বাচন করুন।')
      return
    }
    if (!caseNumber.trim()) {
      setCaseSearchError('মামলা নম্বর লিখুন।')
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
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0c2e33_0%,#164850_45%,#1a6b75_100%)]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(196,146,90,0.35), transparent 35%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.12), transparent 25%)',
          }}
        />
        <div className="container-page relative grid gap-8 py-10 sm:gap-10 sm:py-16 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:py-20">
          <div className="text-sand">
            <p className="font-display text-3xl font-semibold leading-tight text-balance sm:text-5xl lg:text-[3.25rem]">
              NyayPath
            </p>
            <h1 className="mt-3 font-display text-xl font-medium leading-snug text-sand/95 sm:mt-4 sm:text-3xl">
              আপনার মামলা, আপনার তথ্য — সবকিছু এক জায়গায়
            </h1>
            <p className="mt-3 max-w-xl text-sm text-sand/75 sm:mt-4 sm:text-lg">
              মামলার পরবর্তী তারিখ খুঁজুন, উকিলের তথ্য দেখুন এবং সহজে আপনার মামলা পরিচালনা করুন।
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <Button variant="bronze" size="lg" className="w-full sm:w-auto" onClick={() => navigate('/cases/search')}>
                মামলা খুঁজুন
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 sm:w-auto"
                onClick={() => navigate('/lawyers')}
              >
                উকিল খুঁজুন
              </Button>
            </div>
          </div>

          <form
            onSubmit={onSearch}
            className="rounded-2xl border border-white/15 bg-white/95 p-4 shadow-2xl backdrop-blur sm:p-6"
          >
            <div className="flex items-center gap-2 text-ink">
              <Search className="h-5 w-5 text-teal" />
              <h2 className="font-display text-xl font-semibold">মামলা খুঁজুন</h2>
            </div>
            <p className="mt-1 text-sm text-muted">
              বিভাগ ও জেলা দিয়ে সার্চ — সেই নম্বরে যত মামলা আছে সব দেখাবে
            </p>
            <div className="mt-5 space-y-4">
              <BdLocationFilters mode="search" value={caseLoc} onChange={setCaseLoc} tone="hero" />
              <Input
                label="মামলা নম্বর"
                placeholder="যেমন: 1/2026"
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
              <p className="text-xs text-muted">ফরম্যাট: 1/2026 (বছর ৪ সংখ্যা) — 1/26 নয়</p>
              {caseSearchError && <p className="text-sm text-danger">{caseSearchError}</p>}
              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={!caseLoc.division || !caseLoc.district}
              >
                মামলা খুঁজুন
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'মামলা খুঁজুন', to: '/cases/search' },
            { label: 'উকিল খুঁজুন', to: '/lawyers' },
            { label: 'উকিল হিসেবে Register করুন', to: '/register' },
            { label: 'Login', to: '/login' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 py-3.5 text-sm font-semibold text-ink shadow-sm transition hover:border-teal/40 hover:shadow-md"
            >
              <span className="min-w-0 break-words">{item.label}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-teal" />
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-white/70 py-10 sm:py-16">
        <div className="container-page">
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">উকিল খুঁজুন</h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              বিভাগ ও জেলা বাছুন, তারপর মামলার ধরন — সব উকিল / সিভিল / ফৌজদারি / উভয়
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
            <BdLocationFilters value={lawyerLoc} onChange={setLawyerLoc} />

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-ink">মামলার ধরন</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPracticeFilter('')}
                  className={cn(
                    'rounded-lg px-3.5 py-2 text-sm font-semibold transition',
                    practiceFilter === ''
                      ? 'bg-teal text-white shadow-sm'
                      : 'border border-border bg-slate-panel/60 text-ink hover:border-teal/40',
                  )}
                >
                  সব উকিল
                </button>
                {PRACTICE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPracticeFilter(opt.value)}
                    className={cn(
                      'rounded-lg px-3.5 py-2 text-sm font-semibold transition',
                      practiceFilter === opt.value
                        ? 'bg-teal text-white shadow-sm'
                        : 'border border-border bg-slate-panel/60 text-ink hover:border-teal/40',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 max-w-md">
              <Input
                label="নাম দিয়ে খুঁজুন (ঐচ্ছিক)"
                value={lawyerName}
                onChange={(e) => setLawyerName(e.target.value)}
                placeholder="উকিলের নাম"
              />
            </div>
          </div>

          <p className="mt-5 text-sm text-muted">
            {loadingLawyers ? 'লোড হচ্ছে…' : `${filteredLawyers.length} জন উকিল`}
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {!loadingLawyers && filteredLawyers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-muted md:col-span-2 lg:col-span-3">
                এই ফিল্টারে কোনো উকিল পাওয়া যায়নি।
              </p>
            ) : (
              filteredLawyers.map((lawyer) => <LawyerCard key={lawyer.id} lawyer={lawyer} />)
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-8 pb-12 sm:pb-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Why Use This Platform</h2>
          <p className="mt-2 text-muted">সাধারণ মানুষ থেকে উকিল ও স্টাফ — সবার জন্য স্বচ্ছ ও সহজ টুল।</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-white p-5 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal/10 text-teal">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-10 sm:py-16">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">How It Works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-white p-6 shadow-sm">
              <span className="font-display text-4xl font-semibold text-bronze">{s.n}</span>
              <h3 className="mt-3 font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-bronze/30 bg-sand/80 p-4 text-sm text-ink">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-bronze" />
          <p>
            এই প্ল্যাটফর্মে প্রদর্শিত তথ্য শুধুমাত্র তথ্যগত উদ্দেশ্যে ব্যবহারের জন্য। মামলার তথ্যের চূড়ান্ত সত্যতা
            সংশ্লিষ্ট আদালত/কর্তৃপক্ষের রেকর্ড দ্বারা যাচাই করতে হবে।
          </p>
        </div>
      </section>
    </div>
  )
}
