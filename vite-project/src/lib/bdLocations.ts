/** Bangladesh divisions → districts → court & area suggestions */

export type BdDivision = {
  name: string
  districts: string[]
}

export const BD_DIVISIONS: BdDivision[] = [
  {
    name: 'ঢাকা',
    districts: [
      'ঢাকা',
      'গাজীপুর',
      'নারায়ণগঞ্জ',
      'মানিকগঞ্জ',
      'মুন্সিগঞ্জ',
      'নরসিংদী',
      'টাঙ্গাইল',
      'কিশোরগঞ্জ',
      'ফরিদপুর',
      'মাদারীপুর',
      'শরীয়তপুর',
      'রাজবাড়ী',
      'গোপালগঞ্জ',
    ],
  },
  {
    name: 'চট্টগ্রাম',
    districts: [
      'চট্টগ্রাম',
      'কক্সবাজার',
      'রাঙ্গামাটি',
      'বান্দরবান',
      'খাগড়াছড়ি',
      'নোয়াখালী',
      'ফেনী',
      'লক্ষ্মীপুর',
      'চাঁদপুর',
      'কুমিল্লা',
      'ব্রাহ্মণবাড়িয়া',
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

/** Extra known courts / codes by district */
const EXTRA_COURTS: Record<string, string[]> = {
  ঢাকা: [
    'হাইকোর্ট বিভাগ',
    'সুপ্রিম কোর্ট অফ বাংলাদেশ',
    'ঢাকা জেলা জজ আদালত',
    'ঢাকা মেট্রোপলিটন সেশন জজ আদালত',
    'ঢাকা চিফ মেট্রোপলিটন ম্যাজিস্ট্রেট আদালত',
    'ঢাকা চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত',
    'ঢাকা অতিরিক্ত জেলা জজ আদালত',
    'ঢাকা ল্যান্ড সার্ভে ট্রাইব্যুনাল',
    'ঢাকা শ্রম আদালত',
    'নারী ও শিশু নির্যাতন দমন ট্রাইব্যুনাল, ঢাকা',
    'দেউলিয়া আদালত, ঢাকা',
  ],
  চট্টগ্রাম: [
    'চট্টগ্রাম জেলা জজ আদালত',
    'চট্টগ্রাম মেট্রোপলিটন সেশন জজ আদালত',
    'চট্টগ্রাম চিফ মেট্রোপলিটন ম্যাজিস্ট্রেট আদালত',
    'চট্টগ্রাম চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত',
    'নারী ও শিশু নির্যাতন দমন ট্রাইব্যুনাল, চট্টগ্রাম',
  ],
  রাজশাহী: [
    'রাজশাহী জেলা জজ আদালত',
    'রাজশাহী চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত',
    'রাজশাহী সেশন জজ আদালত',
  ],
  সিলেট: [
    'সিলেট জেলা জজ আদালত',
    'সিলেট চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত',
    'সিলেট সেশন জজ আদালত',
  ],
  খুলনা: [
    'খুলনা জেলা জজ আদালত',
    'খুলনা চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত',
    'খুলনা মেট্রোপলিটন ম্যাজিস্ট্রেট আদালত',
  ],
  বরিশাল: ['বরিশাল জেলা জজ আদালত', 'বরিশাল চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত'],
  রংপুর: ['রংপুর জেলা জজ আদালত', 'রংপুর চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত'],
  ময়মনসিংহ: ['ময়মনসিংহ জেলা জজ আদালত', 'ময়মনসিংহ চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত'],
  গাজীপুর: ['গাজীপুর জেলা জজ আদালত', 'গাজীপুর চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত'],
  নারায়ণগঞ্জ: ['নারায়ণগঞ্জ জেলা জজ আদালত', 'নারায়ণগঞ্জ চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত'],
  কুমিল্লা: ['কুমিল্লা জেলা জজ আদালত', 'কুমিল্লা চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত'],
}

const EXTRA_AREAS: Record<string, string[]> = {
  ঢাকা: [
    'সুপ্রিম কোর্ট বার বিল্ডিং',
    'কাজী নজরুল ইসলাম এভিনিউ',
    'পল্টন',
    'মতিঝিল',
    'গুলশান',
    'বনানী',
    'ধানমন্ডি',
    'মিরপুর',
    'উত্তরা',
    'মোহাম্মদপুর',
    'পুরান ঢাকা',
    'বাংলামোটর',
    'ফার্মগেট',
  ],
  চট্টগ্রাম: ['আগ্রাবাদ', 'জিইসি', 'নাসিরাবাদ', 'হালিশহর', 'পাহাড়তলী', 'কাতালগঞ্জ'],
  রাজশাহী: ['শাহ মখদুম এভিনিউ', 'বোয়ালিয়া', 'রাজশাহী কোর্ট এলাকা', 'উপশহর'],
  সিলেট: ['জিন্দাবাজার', 'আম্বরখানা', 'সুবিদ বাজার', 'কোর্ট রোড'],
  খুলনা: ['খালিশপুর', 'দৌলতপুর', 'শিরোমণি', 'কোর্ট এলাকা'],
  গাজীপুর: ['চন্দনা', 'জয়দেবপুর', 'টঙ্গী', 'কোর্ট এলাকা'],
  নারায়ণগঞ্জ: ['চাষাঢ়া', 'ফতুল্লা', 'সিদ্ধিরগঞ্জ'],
}

export function getDivisionNames() {
  return BD_DIVISIONS.map((d) => d.name)
}

export function getDistrictsByDivision(division: string) {
  return BD_DIVISIONS.find((d) => d.name === division)?.districts || []
}

export function findDivisionByDistrict(district: string) {
  return BD_DIVISIONS.find((d) => d.districts.includes(district))?.name || ''
}

export const COURT_TYPES: { value: string; label: string; match: RegExp }[] = [
  { value: 'district_judge', label: 'জেলা জজ আদালত', match: /জেলা জজ/ },
  { value: 'session', label: 'সেশন জজ আদালত', match: /সেশন জজ/ },
  { value: 'cjm', label: 'চিফ জুডিশিয়াল ম্যাজিস্ট্রেট', match: /চিফ জুডিশিয়াল ম্যাজিস্ট্রেট/ },
  { value: 'metro', label: 'মেট্রোপলিটন আদালত', match: /মেট্রোপলিটন/ },
  { value: 'high_court', label: 'হাইকোর্ট / সুপ্রিম কোর্ট', match: /হাইকোর্ট|সুপ্রিম কোর্ট/ },
  { value: 'family', label: 'পারিবারিক আদালত', match: /পারিবারিক/ },
  { value: 'tribunal', label: 'ট্রাইব্যুনাল', match: /ট্রাইব্যুনাল/ },
  { value: 'labour', label: 'শ্রম আদালত', match: /শ্রম আদালত/ },
]

export function getCourtsForDistrict(district: string) {
  if (!district) return []
  const base = [
    `${district} জেলা জজ আদালত`,
    `${district} অতিরিক্ত জেলা জজ আদালত`,
    `${district} সেশন জজ আদালত`,
    `${district} মেট্রোপলিটন সেশন জজ আদালত`,
    `${district} চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত`,
    `${district} সিনিয়র জুডিশিয়াল ম্যাজিস্ট্রেট আদালত`,
    `${district} চিফ মেট্রোপলিটন ম্যাজিস্ট্রেট আদালত`,
    `${district} মেট্রোপলিটন ম্যাজিস্ট্রেট আদালত`,
    `${district} পারিবারিক আদালত`,
    `${district} শ্রম আদালত`,
    `নারী ও শিশু নির্যাতন দমন ট্রাইব্যুনাল, ${district}`,
    `ল্যান্ড সার্ভে ট্রাইব্যুনাল, ${district}`,
  ]
  // হাইকোর্ট শুধু প্রধান জেলাগুলোতে সাজেস্ট
  if (['ঢাকা', 'চট্টগ্রাম', 'রাজশাহী', 'খুলনা', 'সিলেট', 'বরিশাল', 'রংপুর', 'ময়মনসিংহ'].includes(district)) {
    base.push('হাইকোর্ট বিভাগ', 'সুপ্রিম কোর্ট অফ বাংলাদেশ')
  }
  const extra = EXTRA_COURTS[district] || []
  return [...new Set([...extra, ...base])]
}

export function getCourtsByType(district: string, courtType: string) {
  const courts = getCourtsForDistrict(district)
  if (!courtType) return courts
  const type = COURT_TYPES.find((t) => t.value === courtType)
  if (!type) return courts
  const filtered = courts.filter((c) => type.match.test(c))
  // ধরন ম্যাচ না হলেও জেলার সব আদালত দেখাও — খালি লিস্ট এড়াতে
  return filtered.length > 0 ? filtered : courts
}

export function matchesCourtType(courtName: string | undefined, courtType: string) {
  if (!courtType) return true
  if (!courtName) return false
  const type = COURT_TYPES.find((t) => t.value === courtType)
  return type ? type.match.test(courtName) : true
}

export function getAreasForDistrict(district: string) {
  if (!district) return []
  const base = [`${district} কোর্ট এলাকা`, `${district} সদর`, `${district} পৌরসভা`]
  const extra = EXTRA_AREAS[district] || []
  return [...new Set([...extra, ...base])]
}

export function filterSuggestions(list: string[], query: string, limit = 10) {
  const q = query.trim().toLowerCase()
  if (!q) return list.slice(0, limit)
  return list.filter((item) => item.toLowerCase().includes(q)).slice(0, limit)
}
