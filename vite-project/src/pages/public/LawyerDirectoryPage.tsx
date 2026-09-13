import { useMemo, useState } from 'react'
import { LawyerCard } from '@/components/lawyers/LawyerCard'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { getPublicLawyers } from '@/data/mock'

export default function LawyerDirectoryPage() {
  const [name, setName] = useState('')
  const [district, setDistrict] = useState('')
  const [court, setCourt] = useState('')
  const [practice, setPractice] = useState('')
  const [experience, setExperience] = useState('')
  const [bar, setBar] = useState('')

  const lawyers = getPublicLawyers()

  const districts = [...new Set(lawyers.map((l) => l.district))]
  const courts = [...new Set(lawyers.map((l) => l.court))]
  const practices = [...new Set(lawyers.flatMap((l) => l.practiceAreas))]
  const bars = [...new Set(lawyers.map((l) => l.barAssociation))]

  const filtered = useMemo(() => {
    return lawyers.filter((l) => {
      if (name && !l.fullName.toLowerCase().includes(name.toLowerCase())) return false
      if (district && l.district !== district) return false
      if (court && l.court !== court) return false
      if (practice && !l.practiceAreas.includes(practice)) return false
      if (bar && l.barAssociation !== bar) return false
      if (experience) {
        const min = Number(experience)
        if (l.yearsOfExperience < min) return false
      }
      return true
    })
  }, [lawyers, name, district, court, practice, experience, bar])

  return (
    <div className="container-page py-10">
      <h1 className="font-display text-3xl font-semibold">Find a Lawyer</h1>
      <p className="mt-2 text-muted">রেজিস্টার্ড উকিলদের পাবলিক ডিরেক্টরি থেকে খুঁজুন।</p>

      <div className="mt-8 grid gap-3 rounded-xl border border-border bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-3">
        <Input label="Lawyer Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="নাম লিখুন" />
        <Select
          label="District"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          placeholder="সব জেলা"
          options={districts.map((d) => ({ value: d, label: d }))}
        />
        <Select
          label="Court"
          value={court}
          onChange={(e) => setCourt(e.target.value)}
          placeholder="সব আদালত"
          options={courts.map((c) => ({ value: c, label: c }))}
        />
        <Select
          label="Practice Area"
          value={practice}
          onChange={(e) => setPractice(e.target.value)}
          placeholder="সব প্র্যাকটিস এরিয়া"
          options={practices.map((p) => ({ value: p, label: p }))}
        />
        <Select
          label="Experience"
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
          label="Bar Association"
          value={bar}
          onChange={(e) => setBar(e.target.value)}
          placeholder="সব বার"
          options={bars.map((b) => ({ value: b, label: b }))}
        />
      </div>

      <p className="mt-6 text-sm text-muted">{filtered.length} জন উকিল পাওয়া গেছে</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((lawyer) => (
          <LawyerCard key={lawyer.id} lawyer={lawyer} />
        ))}
      </div>
    </div>
  )
}
