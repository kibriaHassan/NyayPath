import { Link } from 'react-router-dom'
import { MapPin, Briefcase, Scale } from 'lucide-react'
import type { Lawyer } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { inferPracticeType, practiceTypeLabel } from '@/lib/practiceTypes'

export function LawyerCard({
  lawyer,
  yearsLabel = 'বছরের অভিজ্ঞতা',
  profileLabel = 'View Profile',
}: {
  lawyer: Lawyer
  yearsLabel?: string
  profileLabel?: string
}) {
  const practiceType = lawyer.practiceType || inferPracticeType(lawyer.practiceAreas)

  return (
    <article className="group flex h-full flex-col rounded-xl border border-border bg-white p-5 shadow-sm transition hover:border-teal/40 hover:shadow-md">
      <div className="flex items-start gap-4">
        <img
          src={lawyer.photo}
          alt={lawyer.fullName}
          className="h-16 w-16 rounded-full border border-border object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-ink group-hover:text-teal">
            {lawyer.fullName}
          </h3>
          <p className="text-sm text-muted">{lawyer.designation}</p>
          <p className="mt-1 text-xs text-muted">{lawyer.barAssociation}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge
          variant={practiceType === 'criminal' ? 'warning' : practiceType === 'both' ? 'info' : 'teal'}
        >
          {practiceTypeLabel(practiceType)}
        </Badge>
        {lawyer.practiceAreas.slice(0, 2).map((area) => (
          <Badge key={area} variant="muted">
            {area}
          </Badge>
        ))}
      </div>

      <ul className="mt-4 space-y-2 text-sm text-muted">
        <li className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-teal" />
          {lawyer.court}
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-teal" />
          {[lawyer.chamberLocation, lawyer.district].filter(Boolean).join(' · ') || lawyer.district}
        </li>
        <li className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-teal" />
          {lawyer.yearsOfExperience} {yearsLabel}
        </li>
      </ul>

      <div className="mt-auto pt-5">
        <Link to={`/lawyers/${lawyer.id}`}>
          <Button variant="outline" fullWidth size="sm">
            {profileLabel}
          </Button>
        </Link>
      </div>
    </article>
  )
}
