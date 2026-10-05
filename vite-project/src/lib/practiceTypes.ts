export type PracticeType = 'civil' | 'criminal' | 'both'

export const PRACTICE_TYPE_OPTIONS: {
  value: PracticeType
  label: string
  short: string
  hint: string
}[] = [
  {
    value: 'civil',
    label: 'শুধু সিভিল',
    short: 'শুধু সিভিল',
    hint: 'কেবল সিভিল / দেওয়ানি মামলা',
  },
  {
    value: 'criminal',
    label: 'শুধু ফৌজদারি',
    short: 'শুধু ফৌজদারি',
    hint: 'কেবল ফৌজদারি মামলা',
  },
  {
    value: 'both',
    label: 'উভয়',
    short: 'উভয়',
    hint: 'সিভিল ও ফৌজদারি — দুটোই',
  },
]

export function practiceTypeLabel(type?: PracticeType | string) {
  return PRACTICE_TYPE_OPTIONS.find((o) => o.value === type)?.short || '—'
}

/**
 * এক্সাক্ট ম্যাচ:
 * শুধু সিভিল → শুধু civil
 * শুধু ফৌজদারি → শুধু criminal
 * উভয় → শুধু both
 */
export function matchesPracticeFilter(
  practiceType: PracticeType | string | undefined,
  filter: PracticeType | '' | undefined,
) {
  if (!filter) return true
  const t = (practiceType || 'both') as PracticeType
  return t === filter
}

export function practiceAreasFromType(type: PracticeType): string[] {
  if (type === 'civil') return ['সিভিল']
  if (type === 'criminal') return ['ফৌজদারি']
  return ['সিভিল', 'ফৌজদারি']
}

export function practiceTypeFromArea(area: string): PracticeType {
  if (/ফৌজদারি|criminal|মারামারি/i.test(area)) return 'criminal'
  if (/সিভিল|civil|দেওয়ানি/i.test(area)) return 'civil'
  return 'civil'
}

export function inferPracticeType(areas: string[] = []): PracticeType {
  const joined = areas.join(' ').toLowerCase()
  const hasCivil = /সিভিল|civil|দেওয়ানি|জমি|পারিবারিক/.test(joined)
  const hasCrime = /ফৌজদারি|criminal|মারামারি|জামিন/.test(joined)
  if (hasCivil && hasCrime) return 'both'
  if (hasCrime) return 'criminal'
  if (hasCivil) return 'civil'
  return 'both'
}

export function buildMapQuery(parts: {
  chamberLocation?: string
  chamberAddress?: string
  district?: string
  division?: string
}) {
  return [parts.chamberAddress, parts.chamberLocation, parts.district, parts.division, 'Bangladesh']
    .filter(Boolean)
    .join(', ')
}

export function googleMapsEmbedUrl(query: string) {
  if (!query.trim()) return ''
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`
}

export function googleMapsOpenUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
