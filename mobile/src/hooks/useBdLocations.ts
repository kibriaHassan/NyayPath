import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import {
  FALLBACK_COURT_TYPES,
  FALLBACK_DIVISIONS,
  type BdLocationFilterValues,
  type LocationCourt,
  type LocationCourtType,
  type LocationDivision,
} from '../data/locations'

export function useBdLocations() {
  const [divisions, setDivisions] = useState<LocationDivision[]>(FALLBACK_DIVISIONS)
  const [courtTypes, setCourtTypes] = useState<LocationCourtType[]>(FALLBACK_COURT_TYPES)
  const [courts, setCourts] = useState<LocationCourt[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    api<{
      data: {
        divisions: LocationDivision[]
        courtTypes: LocationCourtType[]
        courts: LocationCourt[]
      }
    }>('/locations', { auth: false })
      .then((res) => {
        if (!alive) return
        if (res.data?.divisions?.length) setDivisions(res.data.divisions)
        if (res.data?.courtTypes?.length) setCourtTypes(res.data.courtTypes)
        if (res.data?.courts?.length) setCourts(res.data.courts)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReady(true)
      })
    return () => {
      alive = false
    }
  }, [])

  return { divisions, courtTypes, courts, ready }
}

export function useLocationOptions(value: BdLocationFilterValues) {
  const { divisions, courtTypes, courts, ready } = useBdLocations()

  const districtOptions = useMemo(() => {
    if (!value.division) return [] as string[]
    return divisions.find((d) => d.name === value.division)?.districts || []
  }, [divisions, value.division])

  const courtOptions = useMemo(() => {
    if (!value.district) return [] as string[]
    let list = courts.filter((c) => c.district === value.district)
    if (value.division) list = list.filter((c) => c.division === value.division)
    if (value.courtType) {
      const typed = list.filter((c) => c.courtType === value.courtType)
      if (typed.length) list = typed
    }
    if (!list.length && value.district) {
      // Fallback synthetic names when API courts empty
      return [
        `${value.district} জেলা জজ আদালত`,
        `${value.district} সেশন জজ আদালত`,
        `${value.district} পারিবারিক আদালত`,
      ]
    }
    return [...new Set(list.map((c) => c.courtName))]
  }, [courts, value.district, value.division, value.courtType])

  return { divisions, courtTypes, districtOptions, courtOptions, ready }
}
