import { api } from '@/lib/api'
import { getPublicLawyers } from '@/data/mock'
import { inferPracticeType } from '@/lib/practiceTypes'
import type { Lawyer } from '@/types'

function normalizeLawyer(raw: Partial<Lawyer> & { id: string; fullName: string }): Lawyer {
  const practiceAreas = raw.practiceAreas || []
  return {
    id: raw.id,
    fullName: raw.fullName,
    email: raw.email || '',
    mobile: raw.mobile || '',
    barAssociation: raw.barAssociation || '',
    enrollmentNumber: raw.enrollmentNumber || '',
    practiceAreas,
    practiceType: raw.practiceType || inferPracticeType(practiceAreas),
    court: raw.court || '',
    division: raw.division,
    district: raw.district || '',
    chamberName: raw.chamberName || '',
    chamberAddress: raw.chamberAddress || '',
    chamberLocation: raw.chamberLocation,
    bio: raw.bio || '',
    photo: raw.photo || '',
    yearsOfExperience: raw.yearsOfExperience || 0,
    designation: raw.designation || 'অ্যাডভোকেট',
    publicProfileEnabled: raw.publicProfileEnabled !== false,
    visibility: raw.visibility || {
      enrollmentNumber: true,
      mobile: true,
      email: true,
      chamberAddress: true,
      bio: true,
    },
    verified: Boolean(raw.verified),
  }
}

/** পাবলিক উকিল তালিকা — API (Mongo) প্রথমে, ব্যর্থ হলে mock */
export async function loadPublicLawyers(query: {
  practiceType?: string
  name?: string
  district?: string
} = {}): Promise<Lawyer[]> {
  try {
    const params = new URLSearchParams()
    if (query.practiceType) params.set('practiceType', query.practiceType)
    if (query.name) params.set('name', query.name)
    if (query.district) params.set('district', query.district)
    const qs = params.toString()
    const res = await api<{ data: Lawyer[] }>(`/lawyers${qs ? `?${qs}` : ''}`)
    return (res.data || []).map((l) => normalizeLawyer(l))
  } catch {
    return getPublicLawyers().map((l) => normalizeLawyer(l))
  }
}

export async function loadPublicLawyerById(id: string): Promise<Lawyer | null> {
  try {
    const res = await api<{ data: Lawyer }>(`/lawyers/${id}`)
    return res.data ? normalizeLawyer(res.data) : null
  } catch {
    const local = getPublicLawyers().find((l) => l.id === id)
    return local ? normalizeLawyer(local) : null
  }
}
