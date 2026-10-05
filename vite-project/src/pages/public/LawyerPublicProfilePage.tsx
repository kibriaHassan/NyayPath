import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Briefcase, Scale, Mail, Phone, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { loadPublicLawyerById } from '@/lib/publicLawyers'
import {
  buildMapQuery,
  googleMapsEmbedUrl,
  googleMapsOpenUrl,
  inferPracticeType,
  practiceTypeLabel,
} from '@/lib/practiceTypes'
import type { Lawyer } from '@/types'

export default function LawyerPublicProfilePage() {
  const { id } = useParams()
  const [lawyer, setLawyer] = useState<Lawyer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    loadPublicLawyerById(id)
      .then((data) => {
        if (!cancelled) setLawyer(data)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="container-page py-16 text-center text-muted">
        প্রোফাইল লোড হচ্ছে…
      </div>
    )
  }

  if (!lawyer || !lawyer.publicProfileEnabled) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">প্রোফাইল পাওয়া যায়নি</h1>
        <p className="mt-2 text-muted">এই উকিলের পাবলিক প্রোফাইল উপলব্ধ নয়।</p>
        <Link to="/lawyers" className="mt-6 inline-block">
          <Button>ডিরেক্টরিতে ফিরে যান</Button>
        </Link>
      </div>
    )
  }

  const practiceType = lawyer.practiceType || inferPracticeType(lawyer.practiceAreas)
  const mapQuery = buildMapQuery({
    chamberAddress: lawyer.chamberAddress,
    chamberLocation: lawyer.chamberLocation,
    district: lawyer.district,
    division: lawyer.division,
  })
  const mapEmbed = lawyer.visibility.chamberAddress ? googleMapsEmbedUrl(mapQuery) : ''

  return (
    <div className="container-page py-10">
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="h-28 bg-[linear-gradient(135deg,#0c2e33,#1a6b75)]" />
        <div className="px-6 pb-8">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <img
              src={lawyer.photo}
              alt={lawyer.fullName}
              className="h-24 w-24 rounded-full border-4 border-white object-cover shadow"
            />
            <div className="pb-1">
              <h1 className="font-display text-3xl font-semibold text-ink">{lawyer.fullName}</h1>
              <p className="text-muted">{lawyer.designation}</p>
            </div>
            {lawyer.verified && <Badge variant="success">Verified</Badge>}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant={practiceType === 'criminal' ? 'warning' : practiceType === 'both' ? 'info' : 'teal'}>
              {practiceTypeLabel(practiceType)}
            </Badge>
            {lawyer.practiceAreas.map((a) => (
              <Badge key={a} variant="muted">
                {a}
              </Badge>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Briefcase className="mt-0.5 h-4 w-4 text-teal" />
                <span>
                  <strong>Bar:</strong> {lawyer.barAssociation}
                </span>
              </li>
              {lawyer.visibility.enrollmentNumber && (
                <li className="flex items-start gap-3">
                  <Briefcase className="mt-0.5 h-4 w-4 text-teal" />
                  <span>
                    <strong>Enrollment:</strong> {lawyer.enrollmentNumber}
                  </span>
                </li>
              )}
              <li className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-teal" />
                <span>
                  <strong>Chamber:</strong> {lawyer.chamberName}
                  {lawyer.chamberLocation ? ` · ${lawyer.chamberLocation}` : ''}
                </span>
              </li>
              {lawyer.visibility.chamberAddress && (
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-teal" />
                  <span>{lawyer.chamberAddress}</span>
                </li>
              )}
              <li className="flex items-start gap-3">
                <Scale className="mt-0.5 h-4 w-4 text-teal" />
                <span>
                  {lawyer.court} · {[lawyer.district, lawyer.division].filter(Boolean).join(', ')}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Briefcase className="mt-0.5 h-4 w-4 text-teal" />
                <span>{lawyer.yearsOfExperience} বছরের অভিজ্ঞতা</span>
              </li>
            </ul>

            <div className="rounded-xl bg-slate-panel p-5">
              <h2 className="font-semibold">Public Contact</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {lawyer.visibility.email ? (
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-teal" /> {lawyer.email}
                  </li>
                ) : (
                  <li className="text-muted">ইমেইল পাবলিক নয়</li>
                )}
                {lawyer.visibility.mobile ? (
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-teal" /> {lawyer.mobile}
                  </li>
                ) : (
                  <li className="text-muted">মোবাইল পাবলিক নয়</li>
                )}
              </ul>
              {lawyer.visibility.bio && lawyer.bio && (
                <p className="mt-4 text-sm text-muted">{lawyer.bio}</p>
              )}
            </div>
          </div>

          {mapEmbed && (
            <div className="mt-8 overflow-hidden rounded-xl border border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-slate-panel/60 px-3 py-2">
                <p className="text-xs font-semibold text-ink">চেম্বার লোকেশন (ম্যাপ)</p>
                <a
                  href={googleMapsOpenUrl(mapQuery)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-teal hover:underline"
                >
                  Google Maps →
                </a>
              </div>
              <iframe
                title="Chamber location map"
                src={mapEmbed}
                className="h-56 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
