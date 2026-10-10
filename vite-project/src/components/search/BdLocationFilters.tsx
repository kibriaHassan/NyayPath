import { useEffect, useMemo, useState } from 'react'
import { Select } from '@/components/ui/Select'
import {
  BD_DIVISIONS,
  COURT_TYPES,
  getCourtsByType,
  getCourtsForDistrict,
  getDistrictsByDivision,
} from '@/lib/bdLocations'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export type BdLocationFilterValues = {
  division: string
  district: string
  courtType: string
  court: string
}

type ApiDivision = { id?: string; name: string; districts: string[] }
type ApiCourtType = { id?: string; value: string; label: string }
type ApiCourt = {
  id?: string
  division: string
  district: string
  courtType: string
  courtName: string
}

type Props = {
  value: BdLocationFilterValues
  onChange: (next: BdLocationFilterValues) => void
  className?: string
  tone?: 'default' | 'hero'
  /**
   * search — বিভাগ/জেলা আবশ্যক, ধরন/আদালত ফিল্টার
   * entry — চারটাই আবশ্যক (উকিল ডাটা এন্ট্রি)
   */
  mode?: 'search' | 'entry'
  labels?: {
    division?: string
    district?: string
    courtType?: string
    court?: string
    pickDivision?: string
    pickDistrict?: string
    divisionFirst?: string
    pickType?: string
    districtFirst?: string
    pickCourt?: string
    noCourt?: string
  }
  courtTypeLabel?: (value: string, fallback: string) => string
}

export function BdLocationFilters({
  value,
  onChange,
  className,
  tone = 'default',
  mode = 'search',
  labels,
  courtTypeLabel,
}: Props) {
  const { division, district, courtType, court } = value
  const entry = mode === 'entry'

  const [apiDivisions, setApiDivisions] = useState<ApiDivision[] | null>(null)
  const [apiTypes, setApiTypes] = useState<ApiCourtType[] | null>(null)
  const [apiCourts, setApiCourts] = useState<ApiCourt[] | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await api<{
          data: { divisions: ApiDivision[]; courtTypes: ApiCourtType[]; courts: ApiCourt[] }
        }>('/locations')
        if (!alive) return
        if (res.data?.divisions?.length) setApiDivisions(res.data.divisions)
        if (res.data?.courtTypes?.length) setApiTypes(res.data.courtTypes)
        if (res.data?.courts?.length) setApiCourts(res.data.courts)
      } catch {
        /* static fallback */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const divisions = apiDivisions?.length ? apiDivisions : BD_DIVISIONS
  const courtTypes = apiTypes?.length ? apiTypes : COURT_TYPES

  const districtOptions = useMemo(() => {
    if (apiDivisions?.length) {
      const dist = apiDivisions.find((d) => d.name === division)?.districts || []
      return dist.map((d) => ({ value: d, label: d }))
    }
    return getDistrictsByDivision(division).map((d) => ({ value: d, label: d }))
  }, [apiDivisions, division])

  const courtOptions = useMemo(() => {
    if (!district) return []
    if (apiCourts?.length) {
      let list = apiCourts.filter((c) => c.district === district)
      if (division) list = list.filter((c) => c.division === division)
      if (courtType) list = list.filter((c) => c.courtType === courtType)
      // ধরন ম্যাচ না থাকলে জেলার সব
      if (courtType && list.length === 0) {
        list = apiCourts.filter((c) => c.district === district && (!division || c.division === division))
      }
      if (!courtType && entry) {
        list = apiCourts.filter((c) => c.district === district && (!division || c.division === division))
      }
      const names = [...new Set(list.map((c) => c.courtName))]
      const mapped = names.map((c) => ({ value: c, label: c }))
      if (court && !mapped.some((o) => o.value === court)) {
        return [{ value: court, label: court }, ...mapped]
      }
      return mapped
    }
    const mapped = entry && !courtType
      ? getCourtsForDistrict(district).map((c) => ({ value: c, label: c }))
      : getCourtsByType(district, courtType).map((c) => ({ value: c, label: c }))
    if (court && !mapped.some((o) => o.value === court)) {
      return [{ value: court, label: court }, ...mapped]
    }
    return mapped
  }, [apiCourts, district, courtType, entry, division, court])

  const set = (patch: Partial<BdLocationFilterValues>) => {
    onChange({ ...value, ...patch })
  }

  const selectClass = tone === 'hero' ? 'bg-white' : undefined

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <Select
        label={labels?.division || 'বিভাগ'}
        placeholder={labels?.pickDivision || 'বিভাগ নির্বাচন করুন'}
        value={division}
        required={entry}
        options={divisions.map((d) => ({ value: d.name, label: d.name }))}
        onChange={(e) =>
          set({
            division: e.target.value,
            district: '',
            courtType: '',
            court: '',
          })
        }
        className={selectClass}
      />
      <Select
        label={labels?.district || 'জেলা'}
        placeholder={division ? labels?.pickDistrict || 'জেলা নির্বাচন করুন' : labels?.divisionFirst || 'আগে বিভাগ দিন'}
        value={district}
        disabled={!division}
        required={entry}
        options={districtOptions}
        onChange={(e) =>
          set({
            district: e.target.value,
            courtType: '',
            court: '',
          })
        }
        className={selectClass}
      />
      <Select
        label={labels?.courtType || 'আদালতের ধরন'}
        placeholder={district ? labels?.pickType || 'ধরন নির্বাচন করুন' : labels?.districtFirst || 'আগে জেলা দিন'}
        value={courtType}
        disabled={!district}
        required={entry}
        options={courtTypes.map((t) => ({
          value: t.value,
          label: courtTypeLabel ? courtTypeLabel(t.value, t.label) : t.label,
        }))}
        onChange={(e) =>
          set({
            courtType: e.target.value,
            court: '',
          })
        }
        className={selectClass}
      />
      <Select
        label={labels?.court || 'আদালত'}
        placeholder={
          !district
            ? labels?.districtFirst || 'আগে জেলা দিন'
            : courtOptions.length
              ? labels?.pickCourt || 'আদালত নির্বাচন করুন'
              : labels?.noCourt || 'আদালত পাওয়া যায়নি'
        }
        value={court}
        disabled={!district || courtOptions.length === 0}
        required={entry}
        options={courtOptions}
        onChange={(e) => set({ court: e.target.value })}
        className={selectClass}
      />
    </div>
  )
}
