import { findDivisionByDistrict, matchesCourtType } from '@/lib/bdLocations'
import type { Case } from '@/types'

export type CaseSearchFilters = {
  q: string
  division: string
  district: string
  courtType?: string
  court?: string
}

/** Resolve district stored on case or inferred from court fields */
export function caseDistrict(c: Pick<Case, 'district' | 'courtLocation' | 'courtName'>) {
  return (c.district || c.courtLocation || '').trim()
}

export function caseDivision(c: Pick<Case, 'division' | 'district' | 'courtLocation' | 'courtName'>) {
  const stored = (c.division || '').trim()
  if (stored) return stored
  return findDivisionByDistrict(caseDistrict(c))
}

export function matchesCaseSearchFilters(c: Case, filters: CaseSearchFilters) {
  const q = filters.q.trim().toLowerCase()
  if (!q) return false
  if (!filters.division || !filters.district) return false

  if (!c.caseNumber.toLowerCase().includes(q)) return false

  const district = caseDistrict(c)
  const division = caseDivision(c)

  // জেলা ম্যাচ — সংরক্ষিত জেলা বা আদালতের নাম/লোকেশন
  if (filters.district) {
    const exact = district === filters.district
    const blob = `${c.courtName} ${c.courtLocation} ${district}`.toLowerCase()
    if (!exact && !blob.includes(filters.district.toLowerCase())) return false
  }

  // বিভাগ ম্যাচ — থাকলে চেক; না থাকলে জেলা ম্যাচই যথেষ্ট
  if (filters.division && division && division !== filters.division) return false

  if (filters.court) {
    if (c.courtName !== filters.court && !c.courtName.includes(filters.court)) return false
  } else if (filters.courtType) {
    if (!matchesCourtType(c.courtName, filters.courtType)) return false
  }

  return true
}

export function filterCasesBySearch(list: Case[], filters: CaseSearchFilters) {
  return list.filter((c) => matchesCaseSearchFilters(c, filters))
}

export function toPublicCase(c: Case): Case {
  return {
    ...c,
    privateNotes: '',
    importantNotes: '',
    assignedStaffIds: [],
  }
}
