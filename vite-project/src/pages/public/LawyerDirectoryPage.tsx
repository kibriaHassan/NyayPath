import { useEffect, useMemo, useState } from 'react'
import { LawyerCard } from '@/components/lawyers/LawyerCard'
import {
  BdLocationFilters,
  type BdLocationFilterValues,
} from '@/components/search/BdLocationFilters'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { filterLawyersByPracticeType } from '@/data/mock'
import { findDivisionByDistrict, matchesCourtType } from '@/lib/bdLocations'
import { loadPublicLawyers } from '@/lib/publicLawyers'
import { PRACTICE_TYPE_OPTIONS, type PracticeType } from '@/lib/practiceTypes'
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

export default function LawyerDirectoryPage() {
  const [name, setName] = useState('')
  const [loc, setLoc] = useState<BdLocationFilterValues>(emptyLocation)
  const [practice, setPractice] = useState<PracticeType | ''>('')
  const [experience, setExperience] = useState('')
  const [bar, setBar] = useState('')
  const [lawyers, setLawyers] = useState<Lawyer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadPublicLawyers()
      .then((list) => {
        if (!cancelled) setLawyers(list)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const bars = [...new Set(lawyers.map((l) => l.barAssociation).filter(Boolean))]

  const filtered = useMemo(() => {
    let list = filterLawyersByPracticeType(lawyers, practice)
    return list.filter((l) => {
      if (!matchesLawyerLocation(l, loc)) return false
      if (name && !l.fullName.toLowerCase().includes(name.toLowerCase())) return false
      if (bar && l.barAssociation !== bar) return false
      if (experience) {
        const min = Number(experience)
        if (l.yearsOfExperience < min) return false
      }
      return true
    })
  }, [lawyers, name, loc, practice, experience, bar])

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-semibold">উকিল খুঁজুন</h1>
      <p className="mt-2 text-muted">বিভাগ · জেলা · আদালত ও মামলার ধরন দিয়ে রেজিস্টার্ড উকিল খুঁজুন।</p>

      <div className="mt-6 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
        <BdLocationFilters value={loc} onChange={setLoc} />

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-ink">মামলার ধরন</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPractice('')}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-semibold transition',
                practice === ''
                  ? 'bg-teal text-white shadow-sm'
                  : 'border border-border bg-slate-panel/60 hover:border-teal/40',
              )}
            >
              সব উকিল
            </button>
            {PRACTICE_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPractice(opt.value)}
                className={cn(
                  'rounded-lg px-3.5 py-2 text-sm font-semibold transition',
                  practice === opt.value
                    ? 'bg-teal text-white shadow-sm'
                    : 'border border-border bg-slate-panel/60 hover:border-teal/40',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Input label="উকিলের নাম" value={name} onChange={(e) => setName(e.target.value)} placeholder="নাম লিখুন" />
          <Select
            label="অভিজ্ঞতা"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="যেকোনো"
            options={[
              { value: '5', label: '৫+ বছর' },
              { value: '10', label: '১০+ বছর' },
              { value: '15', label: '১৫+ বছর' },
            ]}
          />
          <Select
            label="বার অ্যাসোসিয়েশন"
            value={bar}
            onChange={(e) => setBar(e.target.value)}
            placeholder="সব বার"
            options={bars.map((b) => ({ value: b, label: b }))}
          />
        </div>
      </div>

      <p className="mt-6 text-sm text-muted">
        {loading ? 'লোড হচ্ছে…' : `${filtered.length} জন উকিল পাওয়া গেছে`}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((lawyer) => (
          <LawyerCard key={lawyer.id} lawyer={lawyer} />
        ))}
      </div>
    </div>
  )
}
