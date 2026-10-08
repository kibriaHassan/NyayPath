export type LocationDivision = { id?: string; name: string; districts: string[] }
export type LocationCourtType = { id?: string; value: string; label: string }
export type LocationCourt = {
  id?: string
  division: string
  district: string
  courtType: string
  courtName: string
}

export type BdLocationFilterValues = {
  division: string
  district: string
  courtType: string
  court: string
}

export const EMPTY_LOCATION: BdLocationFilterValues = {
  division: '',
  district: '',
  courtType: '',
  court: '',
}

/** Offline fallback (same core list as backend seed) */
export const FALLBACK_DIVISIONS: LocationDivision[] = [
  {
    name: 'ঢাকা',
    districts: [
      'ঢাকা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'মানিকগঞ্জ', 'মুন্সিগঞ্জ', 'নরসিংদী', 'টাঙ্গাইল',
      'কিশোরগঞ্জ', 'ফরিদপুর', 'মাদারীপুর', 'শরীয়তপুর', 'রাজবাড়ী', 'গোপালগঞ্জ',
    ],
  },
  {
    name: 'চট্টগ্রাম',
    districts: [
      'চট্টগ্রাম', 'কক্সবাজার', 'রাঙ্গামাটি', 'বান্দরবান', 'খাগড়াছড়ি', 'নোয়াখালী',
      'ফেনী', 'লক্ষ্মীপুর', 'চাঁদপুর', 'কুমিল্লা', 'ব্রাহ্মণবাড়িয়া',
    ],
  },
  {
    name: 'রাজশাহী',
    districts: ['রাজশাহী', 'নাটোর', 'নওগাঁ', 'চাঁপাইনবাবগঞ্জ', 'পাবনা', 'সিরাজগঞ্জ', 'বগুড়া', 'জয়পুরহাট'],
  },
  {
    name: 'খুলনা',
    districts: ['খুলনা', 'বাগেরহাট', 'সাতক্ষীরা', 'যশোর', 'ঝিনাইদহ', 'মাগুরা', 'নড়াইল', 'কুষ্টিয়া', 'চুয়াডাঙ্গা', 'মেহেরপুর'],
  },
  {
    name: 'বরিশাল',
    districts: ['বরিশাল', 'ভোলা', 'পটুয়াখালী', 'পিরোজপুর', 'ঝালকাঠি', 'বরগুনা'],
  },
  {
    name: 'সিলেট',
    districts: ['সিলেট', 'মৌলভীবাজার', 'হবিগঞ্জ', 'সুনামগঞ্জ'],
  },
  {
    name: 'রংপুর',
    districts: ['রংপুর', 'দিনাজপুর', 'নীলফামারী', 'গাইবান্ধা', 'কুড়িগ্রাম', 'লালমনিরহাট', 'ঠাকুরগাঁও', 'পঞ্চগড়'],
  },
  {
    name: 'ময়মনসিংহ',
    districts: ['ময়মনসিংহ', 'জামালপুর', 'শেরপুর', 'নেত্রকোণা'],
  },
]

export const FALLBACK_COURT_TYPES: LocationCourtType[] = [
  { value: 'district_judge', label: 'জেলা জজ আদালত' },
  { value: 'session', label: 'সেশন জজ আদালত' },
  { value: 'cjm', label: 'চিফ জুডিশিয়াল ম্যাজিস্ট্রেট' },
  { value: 'metro', label: 'মেট্রোপলিটন আদালত' },
  { value: 'high_court', label: 'হাইকোর্ট / সুপ্রিম কোর্ট' },
  { value: 'family', label: 'পারিবারিক আদালত' },
  { value: 'tribunal', label: 'ট্রাইব্যুনাল' },
  { value: 'labour', label: 'শ্রম আদালত' },
]

/** বাংলা সংখ্যা → ইংরেজি; স্ল্যাশ নরমালাইজ — টাইপ করার সময় লাইভ */
export function toAsciiCaseNumberInput(raw: string): string {
  return String(raw || '')
    .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
    .replace(/[\/\-–—．.٫]/g, '/')
    .replace(/\s+/g, '')
    .replace(/[^\d/]/g, '')
}

export function normalizeCaseNumber(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const ascii = toAsciiCaseNumberInput(raw).trim()
  if (!ascii) return { ok: false, error: 'মামলা নম্বর আবশ্যক।' }
  const m = ascii.match(/^(\d{1,6})\/(\d{2}|\d{4})$/)
  if (!m) {
    return { ok: false, error: 'সঠিক ফরম্যাট: 123/2026' }
  }
  let year = m[2]
  if (year.length === 2) year = `20${year.padStart(2, '0')}`
  const yNum = Number(year)
  if (yNum < 1971 || yNum > 2100) {
    return { ok: false, error: 'বছর ১৯৭১–২১০০ এর মধ্যে হতে হবে।' }
  }
  return { ok: true, value: `${Number(m[1])}/${year}` }
}

export function caseNumberHint(value: string): string {
  const n = normalizeCaseNumber(value)
  if (!value.trim()) return 'উদাহরণ: 123/2026 — বছর সবসময় ৪ সংখ্যা'
  if (!n.ok) return n.error
  return `ফরম্যাট ঠিক আছে: ${n.value}`
}
