import { useState } from 'react'
import { getLawyerById } from '@/data/mock'
import { useAuthStore } from '@/store/authStore'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'

export default function LawyerProfilePage() {
  const user = useAuthStore((s) => s.user)
  const lawyer = getLawyerById(user?.id)
  const [saved, setSaved] = useState(false)
  const [publicEnabled, setPublicEnabled] = useState(lawyer?.publicProfileEnabled ?? true)
  const [visibility, setVisibility] = useState(
    lawyer?.visibility || {
      enrollmentNumber: true,
      mobile: true,
      email: true,
      chamberAddress: true,
      bio: true,
    },
  )

  if (!lawyer && !user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">My Profile</h1>
        <p className="text-sm text-muted">প্রফেশনাল তথ্য ও পাবলিক ভিজিবিলিটি নিয়ন্ত্রণ</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <form
          className="grid gap-4 rounded-xl border border-border bg-white p-5 shadow-sm sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            setSaved(true)
          }}
        >
          <div className="sm:col-span-2 flex items-center gap-4">
            <img
              src={lawyer?.photo || user?.photo}
              alt=""
              className="h-20 w-20 rounded-full border border-border"
            />
            {lawyer?.verified && <Badge variant="success">Verified</Badge>}
          </div>
          <Input label="Full Name" defaultValue={lawyer?.fullName || user?.name} />
          <Input label="Email" defaultValue={lawyer?.email || user?.email} />
          <Input label="Mobile" defaultValue={lawyer?.mobile} />
          <Input label="Designation" defaultValue={lawyer?.designation} />
          <Input label="Bar Association" defaultValue={lawyer?.barAssociation} />
          <Input label="Enrollment Number" defaultValue={lawyer?.enrollmentNumber} />
          <Input label="Court" defaultValue={lawyer?.court} />
          <Input label="District" defaultValue={lawyer?.district} />
          <Input label="Chamber Name" defaultValue={lawyer?.chamberName} />
          <Input label="Years of Experience" type="number" defaultValue={lawyer?.yearsOfExperience} />
          <div className="sm:col-span-2">
            <Input label="Chamber Address" defaultValue={lawyer?.chamberAddress} />
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Professional Bio" defaultValue={lawyer?.bio} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Save Profile</Button>
            {saved && <span className="ml-3 text-sm text-success">সংরক্ষণ হয়েছে (মক)</span>}
          </div>
        </form>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Public Profile Control</h2>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <label className="flex items-center justify-between gap-3">
              <span>Public profile enabled</span>
              <input
                type="checkbox"
                checked={publicEnabled}
                onChange={(e) => setPublicEnabled(e.target.checked)}
              />
            </label>
            {(Object.keys(visibility) as (keyof typeof visibility)[]).map((key) => (
              <label key={key} className="flex items-center justify-between gap-3">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <input
                  type="checkbox"
                  checked={visibility[key]}
                  onChange={(e) => setVisibility((v) => ({ ...v, [key]: e.target.checked }))}
                />
              </label>
            ))}
            <p className="text-xs text-muted">
              পাবলিক ডিরেক্টরি ও কেস সার্চে শুধুমাত্র এনাবল্ড ফিল্ড দেখাবে।
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
