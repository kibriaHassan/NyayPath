import { useState, type FormEvent } from 'react'
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
import { getPublicLawyers } from '@/data/mock'

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
  { n: '১', title: 'মামলা নম্বর দিয়ে Search করুন', desc: 'কেস নম্বর ও ঐচ্ছিক আদালত/লোকেশন দিন।' },
  { n: '২', title: 'মামলার তথ্য দেখুন', desc: 'স্ট্যাটাস, পক্ষ ও মৌলিক তথ্য দেখুন।' },
  { n: '৩', title: 'পরবর্তী তারিখ ও Lawyer দেখুন', desc: 'নেক্সট হেয়ারিং এবং সংশ্লিষ্ট উকিলের প্রোফাইল।' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [caseNumber, setCaseNumber] = useState('')
  const [court, setCourt] = useState('')
  const previewLawyers = getPublicLawyers().slice(0, 3)

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (caseNumber.trim()) params.set('q', caseNumber.trim())
    if (court.trim()) params.set('court', court.trim())
    navigate(`/cases/search?${params.toString()}`)
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0c2e33_0%,#164850_45%,#1a6b75_100%)]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(196,146,90,0.35), transparent 35%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.12), transparent 25%)',
          }}
        />
        <div className="container-page relative grid gap-8 py-10 sm:gap-10 sm:py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
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
              <h2 className="font-display text-xl font-semibold">Search Case</h2>
            </div>
            <p className="mt-1 text-sm text-muted">উদাহরণ: 123/2026</p>
            <div className="mt-5 space-y-3">
              <Input
                label="মামলা নম্বর"
                placeholder="মামলা নম্বর লিখুন: 123/2026"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                required
              />
              <Input
                label="Court / Location (ঐচ্ছিক)"
                placeholder="যেমন: ঢাকা"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
              />
              <Button type="submit" fullWidth size="lg">
                মামলা খুঁজুন
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Quick actions */}
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

      {/* Why */}
      <section className="container-page py-8 pb-12 sm:pb-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Why Use This Platform</h2>
          <p className="mt-2 text-muted">
            সাধারণ মানুষ থেকে উকিল ও স্টাফ — সবার জন্য স্বচ্ছ ও সহজ টুল।
          </p>
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

      {/* Directory preview */}
      <section className="border-y border-border bg-white/70 py-10 sm:py-16">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">Lawyer Directory</h2>
              <p className="mt-2 text-sm text-muted sm:text-base">রেজিস্টার্ড ও পাবলিক প্রোফাইল এনাবল্ড উকিলগণ</p>
            </div>
            <Link to="/lawyers" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">সব উকিল দেখুন</Button>
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {previewLawyers.map((lawyer) => (
              <LawyerCard key={lawyer.id} lawyer={lawyer} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
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
            এই প্ল্যাটফর্মে প্রদর্শিত তথ্য শুধুমাত্র তথ্যগত উদ্দেশ্যে ব্যবহারের জন্য। মামলার তথ্যের চূড়ান্ত সত্যতা সংশ্লিষ্ট আদালত/কর্তৃপক্ষের রেকর্ড দ্বারা যাচাই করতে হবে।
          </p>
        </div>
      </section>
    </div>
  )
}
