import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type LandingLang = 'bn' | 'en'

const STORAGE_KEY = 'nyaypath.landingLang'

const copy = {
  bn: {
    home: 'হোম',
    findLawyer: 'উকিল খুঁজুন',
    caseSearch: 'মামলা খুঁজুন',
    about: 'আমাদের সম্পর্কে',
    contact: 'যোগাযোগ',
    login: 'লগইন',
    staffRegister: 'স্টাফ রেজিস্টার',
    lawyerRegister: 'উকিল হিসেবে রেজিস্টার',
    dashboard: 'ড্যাশবোর্ড',
    menu: 'মেনু',
    heroKicker: 'NyayPath',
    heroTitle: 'আপনার মামলা, আপনার তথ্য — সবকিছু এক জায়গায়',
    heroText: 'মামলার পরবর্তী তারিখ খুঁজুন, উকিলের তথ্য দেখুন এবং সহজে আপনার মামলা পরিচালনা করুন।',
    searchCases: 'মামলা খুঁজুন',
    searchLawyers: 'উকিল খুঁজুন',
    searchTitle: 'মামলা খুঁজুন',
    searchHint: 'বিভাগ ও জেলা দিয়ে সার্চ করলে সেই নম্বরে যত মামলা আছে সব দেখাবে।',
    caseNumber: 'মামলা নম্বর',
    caseNumberPh: 'যেমন: 1/2026',
    caseFormat: 'ফরম্যাট: 1/2026 (বছর ৪ সংখ্যা)',
    needDivision: 'সর্বনিম্ন বিভাগ ও জেলা নির্বাচন করুন।',
    needNumber: 'মামলা নম্বর লিখুন।',
    lawyerRegisterShort: 'উকিল হিসেবে রেজিস্টার করুন',
    lawyersTitle: 'উকিল খুঁজুন',
    lawyersHint: 'বিভাগ ও জেলা বাছুন, তারপর মামলার ধরন — সব উকিল, সিভিল, ফৌজদারি বা উভয়।',
    caseKind: 'মামলার ধরন',
    allLawyers: 'সব উকিল',
    civil: 'শুধু সিভিল',
    criminal: 'শুধু ফৌজদারি',
    both: 'উভয়',
    nameSearch: 'নাম দিয়ে খুঁজুন (ঐচ্ছিক)',
    namePh: 'উকিলের নাম',
    loading: 'লোড হচ্ছে…',
    lawyerCount: 'জন উকিল',
    noLawyers: 'এই ফিল্টারে কোনো উকিল পাওয়া যায়নি।',
    whyTitle: 'কেন এই প্ল্যাটফর্ম',
    whyText: 'সাধারণ মানুষ থেকে উকিল ও স্টাফ — সবার জন্য স্বচ্ছ ও সহজ।',
    howTitle: 'কীভাবে কাজ করে',
    disclaimer:
      'এই প্ল্যাটফর্মে প্রদর্শিত তথ্য শুধুমাত্র তথ্যগত উদ্দেশ্যে। মামলার চূড়ান্ত সত্যতা সংশ্লিষ্ট আদালতের রেকর্ডে যাচাই করুন।',
    footerBlurb: 'মামলার তথ্য, পরবর্তী তারিখ এবং উকিল ডিরেক্টরি — এক প্ল্যাটফর্মে।',
    links: 'লিঙ্ক',
    account: 'অ্যাকাউন্ট',
    reach: 'যোগাযোগ',
    privacy: 'গোপনীয়তা',
    terms: 'শর্তাবলি',
    staffLogin: 'স্টাফ লগইন',
    years: 'বছরের অভিজ্ঞতা',
    viewProfile: 'প্রোফাইল দেখুন',
    division: 'বিভাগ',
    district: 'জেলা',
    courtType: 'আদালতের ধরন',
    court: 'আদালত',
    pickDivision: 'বিভাগ নির্বাচন করুন',
    pickDistrict: 'জেলা নির্বাচন করুন',
    divisionFirst: 'আগে বিভাগ দিন',
    pickType: 'ধরন নির্বাচন করুন',
    districtFirst: 'আগে জেলা দিন',
    pickCourt: 'আদালত নির্বাচন করুন',
    noCourt: 'আদালত পাওয়া যায়নি',
  },
  en: {
    home: 'Home',
    findLawyer: 'Find a Lawyer',
    caseSearch: 'Case Search',
    about: 'About',
    contact: 'Contact',
    login: 'Login',
    staffRegister: 'Staff Register',
    lawyerRegister: 'Register as Lawyer',
    dashboard: 'Dashboard',
    menu: 'Menu',
    heroKicker: 'NyayPath',
    heroTitle: 'Your cases and information, together in one place',
    heroText: 'Look up the next hearing date, find a lawyer, and keep your case easy to follow.',
    searchCases: 'Search cases',
    searchLawyers: 'Find a lawyer',
    searchTitle: 'Search a case',
    searchHint: 'Choose division and district, then a case number, to see every matching case.',
    caseNumber: 'Case number',
    caseNumberPh: 'Example: 1/2026',
    caseFormat: 'Format: 1/2026 (4-digit year)',
    needDivision: 'Choose at least a division and a district.',
    needNumber: 'Enter the case number.',
    lawyerRegisterShort: 'Register as a lawyer',
    lawyersTitle: 'Find a lawyer',
    lawyersHint: 'Pick a division and district, then a practice type — all, civil, criminal, or both.',
    caseKind: 'Practice type',
    allLawyers: 'All lawyers',
    civil: 'Civil only',
    criminal: 'Criminal only',
    both: 'Both',
    nameSearch: 'Search by name (optional)',
    namePh: 'Lawyer name',
    loading: 'Loading…',
    lawyerCount: 'lawyers',
    noLawyers: 'No lawyers match this filter.',
    whyTitle: 'Why use this platform',
    whyText: 'A clear, simple tool for the public, lawyers, and staff.',
    howTitle: 'How it works',
    disclaimer:
      'Information on this platform is for general reference. Confirm the official record with the court.',
    footerBlurb: 'Case information, next dates, and a lawyer directory — on one platform.',
    links: 'Links',
    account: 'Account',
    reach: 'Contact',
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions',
    staffLogin: 'Staff Login',
    years: 'years of experience',
    viewProfile: 'View profile',
    division: 'Division',
    district: 'District',
    courtType: 'Court type',
    court: 'Court',
    pickDivision: 'Choose a division',
    pickDistrict: 'Choose a district',
    divisionFirst: 'Choose a division first',
    pickType: 'Choose a type',
    districtFirst: 'Choose a district first',
    pickCourt: 'Choose a court',
    noCourt: 'No court found',
  },
} as const

export type LandingKey = keyof (typeof copy)['bn']

const COURT_TYPE_EN: Record<string, string> = {
  district_judge: 'District Judge Court',
  session: 'Session Judge Court',
  cjm: 'Chief Judicial Magistrate',
  metro: 'Metropolitan Court',
  high_court: 'High Court / Supreme Court',
  family: 'Family Court',
  tribunal: 'Tribunal',
  labour: 'Labour Court',
}

type Ctx = {
  lang: LandingLang
  setLang: (lang: LandingLang) => void
  t: (key: LandingKey) => string
  courtTypeLabel: (value: string, fallback: string) => string
}

const LandingLangContext = createContext<Ctx | null>(null)

export function LandingLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LandingLang>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'bn'
    } catch {
      return 'bn'
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
  }, [lang])

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key) => copy[lang][key],
      courtTypeLabel: (value, fallback) => (lang === 'en' ? COURT_TYPE_EN[value] || fallback : fallback),
    }),
    [lang],
  )

  return <LandingLangContext.Provider value={value}>{children}</LandingLangContext.Provider>
}

export function useLandingLang() {
  const ctx = useContext(LandingLangContext)
  if (!ctx) throw new Error('useLandingLang must be used inside LandingLangProvider')
  return ctx
}
