import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Briefcase,
  Landmark,
  MessageSquare,
  Scale,
  Users,
  Calendar,
  ShieldCheck,
  Database,
} from 'lucide-react'
import { api } from '@/lib/api'
import { PremiumMetricCard } from '@/components/dashboard/PremiumMetricCard'
import { useAuthStore } from '@/store/authStore'

type Stats = {
  lawyers: number
  staff: number
  cases: number
  hearings: number
  tasks: number
  documents: number
  contacts: number
  courtTypes: number
  courts: number
  divisions: number
  activeLawyers: number
  activeStaff: number
  openCases: number
  upcomingHearings: number
  verifiedLawyers: number
  mongo: boolean
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api<{ data: Stats }>('/admin/stats')
        if (alive) setStats(res.data)
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'স্ট্যাটস লোড হয়নি')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          স্বাগতম, {user?.name || 'Admin'} — পুরো NyayPath প্ল্যাটফর্ম এখান থেকে নিয়ন্ত্রণ করুন।
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumMetricCard
          title="মোট উকিল"
          value={stats?.lawyers ?? '—'}
          hint={`${stats?.verifiedLawyers ?? 0} verified · ${stats?.activeLawyers ?? 0} public`}
          icon={Scale}
        />
        <PremiumMetricCard
          title="মোট Staff"
          value={stats?.staff ?? '—'}
          hint={`${stats?.activeStaff ?? 0} active`}
          icon={Users}
        />
        <PremiumMetricCard
          title="মোট মামলা"
          value={stats?.cases ?? '—'}
          hint={`${stats?.openCases ?? 0} open`}
          icon={Briefcase}
        />
        <PremiumMetricCard
          title="আদালত ক্যাটালগ"
          value={stats?.courts ?? '—'}
          hint={`${stats?.courtTypes ?? 0} ধরন · ${stats?.divisions ?? 0} বিভাগ`}
          icon={Landmark}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PremiumMetricCard
          title="আসন্ন শুনানি"
          value={stats?.upcomingHearings ?? '—'}
          hint={`${stats?.hearings ?? 0} মোট রেকর্ড`}
          icon={Calendar}
          tone="info"
        />
        <PremiumMetricCard
          title="কন্টাক্ট মেসেজ"
          value={stats?.contacts ?? '—'}
          hint="পাবলিক ফর্ম থেকে"
          icon={MessageSquare}
          tone="bronze"
        />
        <PremiumMetricCard
          title="Verified উকিল"
          value={stats?.verifiedLawyers ?? '—'}
          hint="ডিরেক্টরি ব্যাজ"
          icon={ShieldCheck}
          tone="success"
        />
        <PremiumMetricCard
          title="ডাটাবেস"
          value={stats?.mongo ? 'MongoDB' : 'Local JSON'}
          hint={stats?.mongo ? 'Atlas connected' : 'ফাইল fallback'}
          icon={Database}
          tone="ink"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[
          { to: '/admin/lawyers', title: 'উকিল ম্যানেজমেন্ট', desc: 'তালিকা, verify, পাবলিক প্রোফাইল, ডিলিট' },
          { to: '/admin/staff', title: 'Staff ম্যানেজমেন্ট', desc: 'অ্যাকটিভ/ইনঅ্যাকটিভ ও ডিলিট' },
          { to: '/admin/cases', title: 'মামলা ম্যানেজমেন্ট', desc: 'সব মামলা দেখুন ও ডাটাবেস থেকে ডিলিট' },
          { to: '/admin/courts', title: 'আদালত ক্যাটালগ', desc: 'ধরন ও আদালত যোগ/ডিলিট — সারা সাইটে প্রভাব' },
          { to: '/admin/contacts', title: 'কন্টাক্ট ইনবক্স', desc: 'পাবলিক মেসেজ পর্যালোচনা' },
          { to: '/admin/system', title: 'সিস্টেম ও DB', desc: 'কালেকশন কাউন্ট, reseed' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-2xl border border-border bg-white p-5 transition hover:border-teal/40 hover:shadow-sm"
          >
            <p className="font-semibold text-ink">{item.title}</p>
            <p className="mt-1 text-sm text-muted">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
