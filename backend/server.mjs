/**
 * NyayPath Backend — zero external dependencies (Node.js built-ins only)
 * Run: node server.mjs
 */
import http from 'node:http'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto'
import {
  connectMongo,
  loadStateFromMongo,
  saveStateToMongo,
  isMongoConnected,
  closeMongo,
  getCollectionCounts,
  prepareCollections,
  COLLECTIONS,
} from './mongo.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Minimal .env loader (no dotenv dependency) */
function loadEnvFile() {
  const envPath = join(__dirname, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}
loadEnvFile()

const PORT = Number(process.env.PORT || 4000)
const JWT_SECRET = process.env.JWT_SECRET || 'nyaypath-dev-secret-change-in-production'
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
const DATA_DIR = join(__dirname, 'data')
const DB_FILE = join(DATA_DIR, 'db.json')

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const hashBuffer = Buffer.from(hash, 'hex')
  const test = scryptSync(password, salt, 64)
  return timingSafeEqual(hashBuffer, test)
}

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }))
  const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

function verifyToken(token) {
  const [header, body, sig] = token.split('.')
  if (!header || !body || !sig) return null
  const expected = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url')
  if (sig !== expected) return null
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
  if (payload.exp < Date.now()) return null
  return payload
}

function uid(prefix = 'id') {
  return `${prefix}_${randomBytes(8).toString('hex')}`
}

function makeStaffCode(existing = []) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const used = new Set(existing.map((c) => String(c || '').toUpperCase()))
  for (let attempt = 0; attempt < 50; attempt++) {
    let body = ''
    for (let i = 0; i < 6; i++) body += chars[Math.floor(Math.random() * chars.length)]
    const code = `NP-${body}`
    if (!used.has(code)) return code
  }
  return `NP-${randomBytes(3).toString('hex').toUpperCase()}`
}

function ensureStaffCodes(database) {
  if (!database?.staff) return false
  const used = new Set(database.staff.map((s) => s.staffCode).filter(Boolean))
  let dirty = false
  for (const s of database.staff) {
    if (!s.staffCode) {
      s.staffCode = makeStaffCode([...used])
      used.add(s.staffCode)
      dirty = true
    }
  }
  return dirty
}

function normalizeStaffQuery(q) {
  return String(q || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]/g, '')
}

function findStaffByQuery(database, query) {
  const raw = String(query || '').trim()
  if (!raw) return null
  const q = raw.toLowerCase()
  const compact = normalizeStaffQuery(raw)
  const digits = raw.replace(/\D/g, '')
  return (
    database.staff.find((s) => {
      if (String(s.staffCode || '').toLowerCase() === q) return true
      if (normalizeStaffQuery(s.staffCode || '') === compact) return true
      if (String(s.email || '').toLowerCase() === q) return true
      if (digits.length >= 8 && String(s.mobile || '').replace(/\D/g, '').endsWith(digits)) return true
      if (normalizeStaffQuery(s.mobile || '') === compact) return true
      return false
    }) || null
  )
}

function defaultStaffPermissions(overrides = {}) {
  return {
    viewCases: true,
    editCases: false,
    addCase: false,
    viewHearingDates: true,
    editHearingDates: false,
    manageDocuments: false,
    addNotes: true,
    manageTasks: false,
    ...overrides,
  }
}

function publicStaffUser(staff) {
  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: 'STAFF',
    photo: staff.photo,
    lawyerId: staff.lawyerId || '',
    staffCode: staff.staffCode,
    active: staff.active !== false,
  }
}

/** Staff-কে মামলা/শুনানি/টাস্ক থেকে সরিয়ে উকিলের কাছে ফিরিয়ে দাও */
function unassignStaffFromWork(database, staffId) {
  for (const c of database.cases || []) {
    if (Array.isArray(c.assignedStaffIds)) {
      c.assignedStaffIds = c.assignedStaffIds.filter((id) => id !== staffId)
    }
  }
  for (const h of database.hearings || []) {
    if (h.responsibleStaffId === staffId) h.responsibleStaffId = ''
  }
  for (const t of database.tasks || []) {
    if (t.assignedStaffId === staffId) t.assignedStaffId = ''
  }
}

/** উকিল টিম থেকে Staff আলাদা — অ্যাকাউন্ট থাকবে, মামলার লিংক যাবে */
function detachStaffFromLawyer(database, staffId) {
  unassignStaffFromWork(database, staffId)
  const s = (database.staff || []).find((x) => x.id === staffId)
  if (!s) return null
  s.lawyerId = ''
  s.active = false
  s.permissions = defaultStaffPermissions()
  database.notifications = (database.notifications || []).filter((n) => n.userId !== staffId)
  return s
}

function getStaffRecord(auth) {
  if (!auth || auth.role !== 'STAFF') return null
  return (db.staff || []).find((s) => s.id === auth.id) || null
}

function staffIsBlocked(staff) {
  return !staff || staff.active === false
}

const BD_DIVISION_DISTRICTS = {
  ঢাকা: ['ঢাকা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'মানিকগঞ্জ', 'মুন্সিগঞ্জ', 'নরসিংদী', 'টাঙ্গাইল', 'কিশোরগঞ্জ', 'ফরিদপুর', 'মাদারীপুর', 'শরীয়তপুর', 'রাজবাড়ী', 'গোপালগঞ্জ'],
  চট্টগ্রাম: ['চট্টগ্রাম', 'কক্সবাজার', 'রাঙ্গামাটি', 'বান্দরবান', 'খাগড়াছড়ি', 'নোয়াখালী', 'ফেনী', 'লক্ষ্মীপুর', 'চাঁদপুর', 'কুমিল্লা', 'ব্রাহ্মণবাড়িয়া'],
  রাজশাহী: ['রাজশাহী', 'নাটোর', 'নওগাঁ', 'চাঁপাইনবাবগঞ্জ', 'পাবনা', 'সিরাজগঞ্জ', 'বগুড়া', 'জয়পুরহাট'],
  খুলনা: ['খুলনা', 'বাগেরহাট', 'সাতক্ষীরা', 'যশোর', 'ঝিনাইদহ', 'মাগুরা', 'নড়াইল', 'কুষ্টিয়া', 'চুয়াডাঙ্গা', 'মেহেরপুর'],
  বরিশাল: ['বরিশাল', 'ভোলা', 'পটুয়াখালী', 'পিরোজপুর', 'ঝালকাঠি', 'বরগুনা'],
  সিলেট: ['সিলেট', 'মৌলভীবাজার', 'হবিগঞ্জ', 'সুনামগঞ্জ'],
  রংপুর: ['রংপুর', 'দিনাজপুর', 'নীলফামারী', 'গাইবান্ধা', 'কুড়িগ্রাম', 'লালমনিরহাট', 'ঠাকুরগাঁও', 'পঞ্চগড়'],
  ময়মনসিংহ: ['ময়মনসিংহ', 'জামালপুর', 'শেরপুর', 'নেত্রকোণা'],
}

const COURT_TYPE_MATCHERS = {
  district_judge: /জেলা জজ/,
  session: /সেশন জজ/,
  cjm: /চিফ জুডিশিয়াল ম্যাজিস্ট্রেট/,
  metro: /মেট্রোপলিটন/,
  high_court: /হাইকোর্ট|সুপ্রিম কোর্ট/,
  family: /পারিবারিক/,
  tribunal: /ট্রাইব্যুনাল/,
  labour: /শ্রম আদালত/,
}

function findDivisionByDistrictName(district) {
  if (!district) return ''
  for (const [div, list] of Object.entries(BD_DIVISION_DISTRICTS)) {
    if (list.includes(district)) return div
  }
  return ''
}

function caseDistrictOf(c) {
  return String(c.district || c.courtLocation || '').trim()
}

function caseDivisionOf(c) {
  return String(c.division || findDivisionByDistrictName(caseDistrictOf(c)) || '').trim()
}

function matchesCourtTypeName(courtName, courtType) {
  if (!courtType) return true
  const re = COURT_TYPE_MATCHERS[courtType]
  if (!re) return true
  return re.test(String(courtName || ''))
}

function matchesPublicCaseSearch(c, { q, division, district, courtType, court }) {
  const cn = normalizeCaseNumber(c.caseNumber)
  const caseNum = (cn.ok ? cn.value : String(c.caseNumber || '')).toLowerCase()
  if (!caseNum.includes(q)) return false

  const cDistrict = caseDistrictOf(c)
  const cDivision = caseDivisionOf(c)
  const blob = `${c.courtName || ''} ${c.courtLocation || ''} ${cDistrict}`.toLowerCase()

  if (district) {
    const exact = cDistrict === district
    if (!exact && !blob.includes(district.toLowerCase())) return false
  }
  if (division && cDivision && cDivision !== division) return false

  if (court) {
    if (c.courtName !== court && !String(c.courtName || '').includes(court)) return false
  } else if (courtType && !matchesCourtTypeName(c.courtName, courtType)) {
    return false
  }
  return true
}

function ensureCaseLocations(database) {
  if (!database?.cases) return false
  let dirty = false
  for (const c of database.cases) {
    if (!c.district) {
      c.district = c.courtLocation || ''
      dirty = true
    }
    if (!c.division) {
      c.division = findDivisionByDistrictName(c.district) || ''
      if (c.division) dirty = true
    }
  }
  return dirty
}

/** 1/26 → 1/2026 ; always 4-digit year */
function normalizeCaseNumber(raw) {
  const input = String(raw || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
    .replace(/[\/\-–—]/g, '/')
  if (!input) return { ok: false, error: 'মামলা নম্বর আবশ্যক।' }
  const m = input.match(/^(\d{1,6})\/(\d{2}|\d{4})$/)
  if (!m) {
    return { ok: false, error: 'সঠিক ফরম্যাট: 1/2026 (নম্বর/৪-অঙ্কের বছর)। 1/26 লিখবেন না।' }
  }
  const serial = String(Number(m[1]))
  let year = m[2]
  if (year.length === 2) year = `20${year}`
  const yNum = Number(year)
  if (yNum < 1971 || yNum > 2100) {
    return { ok: false, error: 'বছর ১৯৭১–২১০০ এর মধ্যে হতে হবে।' }
  }
  return { ok: true, value: `${serial}/${year}` }
}

function sameCaseRecord(c, { caseNumber, division, district, courtName }) {
  const n = normalizeCaseNumber(c.caseNumber)
  const cNum = n.ok ? n.value : String(c.caseNumber || '').trim()
  return (
    cNum.toLowerCase() === caseNumber.toLowerCase() &&
    String(c.division || '') === String(division || '') &&
    String(c.district || c.courtLocation || '') === String(district || '') &&
    String(c.courtName || '') === String(courtName || '')
  )
}

function findMatchingCase(database, key) {
  return database.cases.find((c) => sameCaseRecord(c, key)) || null
}

function lawyerCanAccessCase(c, lawyerId) {
  return (
    c.ownerLawyerId === lawyerId ||
    c.plaintiffLawyerId === lawyerId ||
    c.defendantLawyerId === lawyerId
  )
}

function clearLawyerFromSide(c, side) {
  if (side === 'plaintiff') {
    c.plaintiffLawyerId = undefined
    c.plaintiffLawyerName = ''
  } else {
    c.defendantLawyerId = undefined
    c.defendantLawyerName = ''
  }
}

function assignLawyerToSide(c, side, lawyerId, lawyerName) {
  if (side === 'plaintiff') {
    c.plaintiffLawyerId = lawyerId
    c.plaintiffLawyerName = lawyerName
  } else {
    c.defendantLawyerId = lawyerId
    c.defendantLawyerName = lawyerName
  }
}

function publicCaseView(c) {
  return {
    ...c,
    privateNotes: undefined,
    importantNotes: undefined,
    assignedStaffIds: [],
  }
}

function seedDb() {
  const lawyerPass = hashPassword('lawyer123')
  const staffPass = hashPassword('staff123')

  const lawyers = [
    {
      id: 'law-1',
      userId: 'user-law-1',
      fullName: 'অ্যাডভোকেট রফিকুল ইসলাম',
      email: 'rafiqul@nyaypath.bd',
      mobile: '01711-234567',
      passwordHash: lawyerPass,
      barAssociation: 'ঢাকা বার অ্যাসোসিয়েশন',
      enrollmentNumber: 'D-4521/2012',
      practiceAreas: ['সিভিল', 'পারিবারিক', 'জমি জমা'],
      practiceType: 'civil',
      court: 'ঢাকা জেলা জজ আদালত',
      division: 'ঢাকা',
      district: 'ঢাকা',
      chamberName: 'ইসলাম ল চেম্বার',
      chamberAddress: 'রুম ৩০৫, সুপ্রিম কোর্ট বার বিল্ডিং, ঢাকা',
      chamberLocation: 'সুপ্রিম কোর্ট বার বিল্ডিং',
      bio: '১৪ বছরের অভিজ্ঞতাসম্পন্ন সিভিল ও পারিবারিক আইন বিশেষজ্ঞ।',
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=RI&backgroundColor=0c2e33',
      yearsOfExperience: 14,
      designation: 'অ্যাডভোকেট',
      publicProfileEnabled: true,
      verified: true,
      visibility: { enrollmentNumber: true, mobile: true, email: true, chamberAddress: true, bio: true },
    },
    {
      id: 'law-2',
      userId: 'user-law-2',
      fullName: 'অ্যাডভোকেট সাবরিনা আহমেদ',
      email: 'sabrina@nyaypath.bd',
      mobile: '01812-345678',
      passwordHash: lawyerPass,
      barAssociation: 'বাংলাদেশ সুপ্রিম কোর্ট বার',
      enrollmentNumber: 'SC-2189/2015',
      practiceAreas: ['ফৌজদারি', 'সাংবিধানিক'],
      practiceType: 'criminal',
      court: 'হাইকোর্ট বিভাগ',
      division: 'ঢাকা',
      district: 'ঢাকা',
      chamberName: 'আহমেদ অ্যাসোসিয়েটস',
      chamberAddress: 'প্লট ১২, গুলশান অ্যাভিনিউ, ঢাকা',
      chamberLocation: 'গুলশান',
      bio: 'ফৌজদারি ও সাংবিধানিক মামলায় বিশেষজ্ঞ।',
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=SA&backgroundColor=1a6b75',
      yearsOfExperience: 11,
      designation: 'অ্যাডভোকেট',
      publicProfileEnabled: true,
      verified: true,
      visibility: { enrollmentNumber: true, mobile: false, email: true, chamberAddress: true, bio: true },
    },
    {
      id: 'law-3',
      userId: 'user-law-3',
      fullName: 'অ্যাডভোকেট কামরুল হাসান',
      email: 'kamrul@nyaypath.bd',
      mobile: '01913-456789',
      passwordHash: lawyerPass,
      barAssociation: 'চট্টগ্রাম বার অ্যাসোসিয়েশন',
      enrollmentNumber: 'C-3310/2010',
      practiceAreas: ['কর্পোরেট', 'ব্যাংকিং', 'চুক্তি'],
      court: 'চট্টগ্রাম জেলা জজ আদালত',
      district: 'চট্টগ্রাম',
      chamberName: 'হাসান ল ফার্ম',
      chamberAddress: 'আগ্রাবাদ কমার্সিয়াল এরিয়া, চট্টগ্রাম',
      bio: 'কর্পোরেট ও বাণিজ্যিক আইনে ১৬ বছরের অভিজ্ঞতা।',
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=KH&backgroundColor=9a6b3f',
      yearsOfExperience: 16,
      designation: 'সিনিয়র অ্যাডভোকেট',
      publicProfileEnabled: true,
      verified: true,
      visibility: { enrollmentNumber: false, mobile: true, email: true, chamberAddress: true, bio: true },
    },
    {
      id: 'law-4',
      userId: 'user-law-4',
      fullName: 'অ্যাডভোকেট নাজমুন নাহার',
      email: 'nazmun@nyaypath.bd',
      mobile: '01614-567890',
      passwordHash: lawyerPass,
      barAssociation: 'রাজশাহী বার অ্যাসোসিয়েশন',
      enrollmentNumber: 'R-1876/2018',
      practiceAreas: ['পারিবারিক', 'উত্তরাধিকার', 'সিভিল'],
      court: 'রাজশাহী জেলা জজ আদালত',
      district: 'রাজশাহী',
      chamberName: 'নাহার চেম্বার',
      chamberAddress: 'শাহ মখদুম এভিনিউ, রাজশাহী',
      bio: 'পারিবারিক ও উত্তরাধিকার মামলায় বিশেষজ্ঞ।',
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=NN&backgroundColor=164850',
      yearsOfExperience: 8,
      designation: 'অ্যাডভোকেট',
      publicProfileEnabled: true,
      verified: true,
      visibility: { enrollmentNumber: true, mobile: true, email: false, chamberAddress: true, bio: true },
    },
    {
      id: 'law-5',
      userId: 'user-law-5',
      fullName: 'অ্যাডভোকেট তানভীর আলম',
      email: 'tanvir@nyaypath.bd',
      mobile: '01515-678901',
      passwordHash: lawyerPass,
      barAssociation: 'সিলেট বার অ্যাসোসিয়েশন',
      enrollmentNumber: 'S-9901/2014',
      practiceAreas: ['জমি জমা', 'রেকর্ড সংশোধন', 'সিভিল'],
      court: 'সিলেট জেলা জজ আদালত',
      district: 'সিলেট',
      chamberName: 'আলম অ্যান্ড পার্টনার্স',
      chamberAddress: 'জিন্দাবাজার, সিলেট',
      bio: 'জমি ও রেকর্ড সংক্রান্ত মামলায় দীর্ঘ অভিজ্ঞতা।',
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=TA&backgroundColor=0c2e33',
      yearsOfExperience: 12,
      designation: 'অ্যাডভোকেট',
      publicProfileEnabled: true,
      verified: false,
      visibility: { enrollmentNumber: true, mobile: true, email: true, chamberAddress: false, bio: true },
    },
  ]

  const staff = [
    {
      id: 'stf-1',
      staffCode: 'NP-STF001',
      userId: 'user-stf-1',
      lawyerId: 'law-1',
      name: 'মাহমুদ হাসান',
      email: 'mahmud@nyaypath.bd',
      mobile: '01720-111111',
      passwordHash: staffPass,
      role: 'Case Manager',
      active: true,
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=MH&backgroundColor=1a6b75',
      permissions: {
        viewCases: true,
        editCases: true,
        addCase: false,
        viewHearingDates: true,
        editHearingDates: false,
        manageDocuments: true,
        addNotes: true,
        manageTasks: true,
      },
    },
    {
      id: 'stf-2',
      staffCode: 'NP-STF002',
      userId: 'user-stf-2',
      lawyerId: 'law-1',
      name: 'ফারহানা ইয়াসমিন',
      email: 'farhana@nyaypath.bd',
      mobile: '01720-222222',
      passwordHash: staffPass,
      role: 'Legal Assistant',
      active: true,
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=FY&backgroundColor=9a6b3f',
      permissions: {
        viewCases: true,
        editCases: false,
        addCase: false,
        viewHearingDates: true,
        editHearingDates: true,
        manageDocuments: false,
        addNotes: true,
        manageTasks: false,
      },
    },
    {
      id: 'stf-3',
      staffCode: 'NP-STF003',
      userId: 'user-stf-3',
      lawyerId: 'law-1',
      name: 'রাকিবুল ইসলাম',
      email: 'rakib@nyaypath.bd',
      mobile: '01720-333333',
      passwordHash: staffPass,
      role: 'Office Assistant',
      active: true,
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=RI2&backgroundColor=164850',
      permissions: {
        viewCases: true,
        editCases: false,
        addCase: false,
        viewHearingDates: true,
        editHearingDates: false,
        manageDocuments: false,
        addNotes: true,
        manageTasks: false,
      },
    },
    {
      id: 'stf-4',
      staffCode: 'NP-STF004',
      userId: 'user-stf-4',
      lawyerId: 'law-2',
      name: 'নুসরাত জাহান',
      email: 'nusrat@nyaypath.bd',
      mobile: '01820-444444',
      passwordHash: staffPass,
      role: 'Case Manager',
      active: true,
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=NJ&backgroundColor=0c2e33',
      permissions: {
        viewCases: true,
        editCases: true,
        addCase: true,
        viewHearingDates: true,
        editHearingDates: false,
        manageDocuments: true,
        addNotes: true,
        manageTasks: false,
      },
    },
    {
      id: 'stf-5',
      staffCode: 'NP-STF005',
      userId: 'user-stf-5',
      lawyerId: 'law-2',
      name: 'ইমরান হোসেন',
      email: 'imran@nyaypath.bd',
      mobile: '01820-555555',
      passwordHash: staffPass,
      role: 'Legal Assistant',
      active: true,
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=IH&backgroundColor=1a6b75',
      permissions: {
        viewCases: true,
        editCases: false,
        addCase: false,
        viewHearingDates: true,
        editHearingDates: false,
        manageDocuments: false,
        addNotes: true,
        manageTasks: true,
      },
    },
    {
      id: 'stf-6',
      staffCode: 'NP-STF006',
      userId: 'user-stf-6',
      lawyerId: 'law-3',
      name: 'সাদ্দাম হোসেন',
      email: 'saddam@nyaypath.bd',
      mobile: '01920-666666',
      passwordHash: staffPass,
      role: 'Case Manager',
      active: true,
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=SH&backgroundColor=9a6b3f',
      permissions: {
        viewCases: true,
        editCases: true,
        addCase: false,
        viewHearingDates: true,
        editHearingDates: true,
        manageDocuments: true,
        addNotes: true,
        manageTasks: false,
      },
    },
    {
      id: 'stf-7',
      staffCode: 'NP-STF007',
      userId: 'user-stf-7',
      lawyerId: 'law-4',
      name: 'আফরোজা বেগম',
      email: 'afroza@nyaypath.bd',
      mobile: '01620-777777',
      passwordHash: staffPass,
      role: 'Legal Assistant',
      active: true,
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=AB&backgroundColor=164850',
      permissions: {
        viewCases: true,
        editCases: false,
        addCase: false,
        viewHearingDates: true,
        editHearingDates: false,
        manageDocuments: false,
        addNotes: true,
        manageTasks: false,
      },
    },
    {
      id: 'stf-8',
      staffCode: 'NP-STF008',
      userId: 'user-stf-8',
      lawyerId: 'law-5',
      name: 'জাহিদুল করিম',
      email: 'jahid@nyaypath.bd',
      mobile: '01520-888888',
      passwordHash: staffPass,
      role: 'Office Assistant',
      active: false,
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=JK&backgroundColor=0c2e33',
      permissions: {
        viewCases: true,
        editCases: false,
        addCase: false,
        viewHearingDates: true,
        editHearingDates: false,
        manageDocuments: false,
        addNotes: true,
        manageTasks: false,
      },
    },
  ]

  const cases = [
    {
      id: 'case-1',
      caseNumber: '123/2026',
      caseTitle: 'করিম উদ্দিন বনাম রহিম মিয়া',
      caseType: 'সিভিল স্যুট',
      courtName: 'ঢাকা জেলা জজ আদালত',
      courtLocation: 'ঢাকা',
      filingDate: '2025-11-12',
      status: 'Hearing Scheduled',
      plaintiff: 'করিম উদ্দিন',
      defendant: 'রহিম মিয়া',
      plaintiffLawyerId: 'law-1',
      defendantLawyerId: 'law-2',
      plaintiffLawyerName: 'অ্যাডভোকেট রফিকুল ইসলাম',
      defendantLawyerName: 'অ্যাডভোকেট সাবরিনা আহমেদ',
      nextHearingDate: '2026-09-18',
      judgeName: 'বিচারক আব্দুল্লাহ আল মামুন',
      description: 'জমি দখল সংক্রান্ত সিভিল মামলা।',
      assignedStaffIds: ['stf-1', 'stf-2'],
      importantNotes: 'পরবর্তী শুনানিতে কাগজপত্র জমা দিতে হবে।',
      privateNotes: 'ক্লায়েন্টের সাথে গোপন আলোচনা — সাক্ষী তালিকা চূড়ান্ত হয়নি।',
      ownerLawyerId: 'law-1',
    },
    {
      id: 'case-2',
      caseNumber: '456/2025',
      caseTitle: 'রাষ্ট্র বনাম জাহিদ হাসান',
      caseType: 'ফৌজদারি',
      courtName: 'মেট্রোপলিটন সেশন জজ আদালত',
      courtLocation: 'ঢাকা',
      filingDate: '2025-06-20',
      status: 'Active',
      plaintiff: 'রাষ্ট্র',
      defendant: 'জাহিদ হাসান',
      defendantLawyerId: 'law-2',
      defendantLawyerName: 'অ্যাডভোকেট সাবরিনা আহমেদ',
      nextHearingDate: '2026-09-15',
      judgeName: 'বিচারক নাসরিন সুলতানা',
      description: 'ফৌজদারি মামলা — জামিন শুনানির অপেক্ষায়।',
      assignedStaffIds: ['stf-4'],
      importantNotes: 'জামিন আবেদন প্রস্তুত।',
      privateNotes: 'সাক্ষীর নিরাপত্তা বিষয়ে নোট।',
      ownerLawyerId: 'law-2',
    },
    {
      id: 'case-3',
      caseNumber: '789/2026',
      caseTitle: 'মোঃ আলমগীর বনাম ব্যাংক এশিয়া',
      caseType: 'ব্যাংকিং / কর্পোরেট',
      courtName: 'চট্টগ্রাম জেলা জজ আদালত',
      courtLocation: 'চট্টগ্রাম',
      filingDate: '2026-01-08',
      status: 'Pending',
      plaintiff: 'মোঃ আলমগীর',
      defendant: 'ব্যাংক এশিয়া',
      plaintiffLawyerId: 'law-3',
      plaintiffLawyerName: 'অ্যাডভোকেট কামরুল হাসান',
      nextHearingDate: '2026-09-22',
      judgeName: 'বিচারক ফারুক আহমেদ',
      description: 'ঋণ চুক্তি ও সুদ সংক্রান্ত বিরোধ।',
      assignedStaffIds: ['stf-6'],
      importantNotes: 'ব্যাংকের কাগজপত্র চাওয়া হয়েছে।',
      privateNotes: 'আলোচনার মাধ্যমে নিষ্পত্তির সম্ভাবনা আছে।',
      ownerLawyerId: 'law-3',
    },
    {
      id: 'case-4',
      caseNumber: '321/2024',
      caseTitle: 'সালমা বেগম বনাম করিম মিয়া',
      caseType: 'পারিবারিক',
      courtName: 'রাজশাহী পারিবারিক আদালত',
      courtLocation: 'রাজশাহী',
      filingDate: '2024-09-15',
      status: 'Hearing Scheduled',
      plaintiff: 'সালমা বেগম',
      defendant: 'করিম মিয়া',
      plaintiffLawyerId: 'law-4',
      plaintiffLawyerName: 'অ্যাডভোকেট নাজমুন নাহার',
      nextHearingDate: '2026-09-12',
      judgeName: 'বিচারক শিরিন আখতার',
      description: 'ভরণপোষণ ও খোরপোশ সংক্রান্ত মামলা।',
      assignedStaffIds: ['stf-7'],
      importantNotes: 'আজকের শুনানি।',
      privateNotes: 'ক্লায়েন্টের আর্থিক অবস্থা সংক্রান্ত অভ্যন্তরীণ নোট।',
      ownerLawyerId: 'law-4',
    },
    {
      id: 'case-5',
      caseNumber: '555/2025',
      caseTitle: 'আব্দুর রহমান বনাম মোঃ সেলিম',
      caseType: 'জমি জমা',
      courtName: 'সিলেট জেলা জজ আদালত',
      courtLocation: 'সিলেট',
      filingDate: '2025-03-02',
      status: 'Active',
      plaintiff: 'আব্দুর রহমান',
      defendant: 'মোঃ সেলিম',
      plaintiffLawyerId: 'law-5',
      defendantLawyerId: 'law-1',
      plaintiffLawyerName: 'অ্যাডভোকেট তানভীর আলম',
      defendantLawyerName: 'অ্যাডভোকেট রফিকুল ইসলাম',
      nextHearingDate: '2026-10-05',
      judgeName: 'বিচারক হাসান মাহমুদ',
      description: 'রেকর্ড সংশোধন ও মালিকানা দাবি।',
      assignedStaffIds: ['stf-1'],
      importantNotes: 'সার্ভে রিপোর্ট প্রয়োজন।',
      privateNotes: 'সার্ভেয়রের সাথে যোগাযোগ চলছে।',
      ownerLawyerId: 'law-5',
    },
    {
      id: 'case-6',
      caseNumber: '112/2026',
      caseTitle: 'নূর জাহান বনাম সিটি কর্পোরেশন',
      caseType: 'সিভিল',
      courtName: 'ঢাকা জেলা জজ আদালত',
      courtLocation: 'ঢাকা',
      filingDate: '2026-02-14',
      status: 'Hearing Scheduled',
      plaintiff: 'নূর জাহান',
      defendant: 'ঢাকা দক্ষিণ সিটি কর্পোরেশন',
      plaintiffLawyerId: 'law-1',
      plaintiffLawyerName: 'অ্যাডভোকেট রফিকুল ইসলাম',
      nextHearingDate: '2026-09-25',
      judgeName: 'বিচারক আব্দুল্লাহ আল মামুন',
      description: 'অবৈধ উচ্ছেদ রোধে নিষেধাজ্ঞা চেয়ে মামলা।',
      assignedStaffIds: ['stf-2', 'stf-3'],
      importantNotes: 'স্থগিতাদেশ আবেদন দাখিল করা হয়েছে।',
      privateNotes: 'মিডিয়া সংশ্লিষ্টতা এড়াতে নির্দেশ।',
      ownerLawyerId: 'law-1',
    },
    {
      id: 'case-7',
      caseNumber: '998/2023',
      caseTitle: 'মেসার্স গ্রিন টেক বনাম মেসার্স ব্লু ওয়েভ',
      caseType: 'চুক্তি / কর্পোরেট',
      courtName: 'চট্টগ্রাম জেলা জজ আদালত',
      courtLocation: 'চট্টগ্রাম',
      filingDate: '2023-12-01',
      status: 'Disposed',
      plaintiff: 'মেসার্স গ্রিন টেক',
      defendant: 'মেসার্স ব্লু ওয়েভ',
      plaintiffLawyerId: 'law-3',
      plaintiffLawyerName: 'অ্যাডভোকেট কামরুল হাসান',
      nextHearingDate: '2026-01-10',
      judgeName: 'বিচারক ফারুক আহমেদ',
      description: 'চুক্তি ভঙ্গ সংক্রান্ত মামলা — নিষ্পত্তি হয়েছে।',
      assignedStaffIds: ['stf-6'],
      importantNotes: 'রায়ের কপি সংগ্রহ করতে হবে।',
      privateNotes: 'ফি বকেয়া আছে।',
      ownerLawyerId: 'law-3',
    },
    {
      id: 'case-8',
      caseNumber: '220/2026',
      caseTitle: 'রিনা আক্তার বনাম শামীম রেজা',
      caseType: 'পারিবারিক',
      courtName: 'ঢাকা পারিবারিক আদালত',
      courtLocation: 'ঢাকা',
      filingDate: '2026-04-18',
      status: 'Pending',
      plaintiff: 'রিনা আক্তার',
      defendant: 'শামীম রেজা',
      plaintiffLawyerId: 'law-2',
      plaintiffLawyerName: 'অ্যাডভোকেট সাবরিনা আহমেদ',
      nextHearingDate: '2026-09-30',
      judgeName: 'বিচারক তania চৌধুরী',
      description: 'তালাক ও দেনমোহর দাবি।',
      assignedStaffIds: ['stf-5'],
      importantNotes: 'সাক্ষ্য গ্রহণের তারিখ নির্ধারণ।',
      privateNotes: 'ক্লায়েন্টের নিরাপত্তা পরিকল্পনা।',
      ownerLawyerId: 'law-2',
    },
    {
      id: 'case-9',
      caseNumber: '667/2025',
      caseTitle: 'মোস্তাফিজুর রহমান বনাম ল্যান্ড অফিস',
      caseType: 'রেকর্ড সংশোধন',
      courtName: 'সিলেট জেলা জজ আদালত',
      courtLocation: 'সিলেট',
      filingDate: '2025-08-22',
      status: 'Active',
      plaintiff: 'মোস্তাফিজুর রহমান',
      defendant: 'সংশ্লিষ্ট ল্যান্ড অফিস',
      plaintiffLawyerId: 'law-5',
      plaintiffLawyerName: 'অ্যাডভোকেট তানভীর আলম',
      nextHearingDate: '2026-10-12',
      judgeName: 'বিচারক হাসান মাহমুদ',
      description: 'নামজারি ও খতিয়ান সংশোধন।',
      assignedStaffIds: [],
      importantNotes: 'সার্টিফাইড কপি সংগ্রহ।',
      privateNotes: 'অফিসিয়াল ফি নিয়ে আলোচনা।',
      ownerLawyerId: 'law-5',
    },
    {
      id: 'case-10',
      caseNumber: '404/2026',
      caseTitle: 'হাসান আলী বনাম কবির আহমেদ',
      caseType: 'সিভিল স্যুট',
      courtName: 'রাজশাহী জেলা জজ আদালত',
      courtLocation: 'রাজশাহী',
      filingDate: '2026-05-05',
      status: 'Closed',
      plaintiff: 'হাসান আলী',
      defendant: 'কবির আহমেদ',
      plaintiffLawyerId: 'law-4',
      plaintiffLawyerName: 'অ্যাডভোকেট নাজমুন নাহার',
      defendantLawyerName: 'অ্যাডভোকেট মোঃ ইউনুস (প্ল্যাটফর্ম বহির্ভূত)',
      nextHearingDate: '2026-06-01',
      judgeName: 'বিচারক শিরিন আখতার',
      description: 'ঋণ আদায় সংক্রান্ত মামলা — বন্ধ।',
      assignedStaffIds: ['stf-7'],
      importantNotes: 'ফাইল আর্কাইভ করা হয়েছে।',
      privateNotes: 'ক্লায়েন্ট সন্তুষ্ট।',
      ownerLawyerId: 'law-4',
    },
  ]

  const hearings = [
    {
      id: 'hr-1',
      caseId: 'case-1',
      caseNumber: '123/2026',
      caseTitle: 'করিম উদ্দিন বনাম রহিম মিয়া',
      hearingDate: '2026-09-18',
      hearingTime: '10:30',
      court: 'ঢাকা জেলা জজ আদালত',
      hearingType: 'Argument',
      notes: 'কাগজপত্র জমা',
      responsibleStaffId: 'stf-1',
      lawyerId: 'law-1',
    },
    {
      id: 'hr-2',
      caseId: 'case-2',
      caseNumber: '456/2025',
      caseTitle: 'রাষ্ট্র বনাম জাহিদ হাসান',
      hearingDate: '2026-09-15',
      hearingTime: '11:00',
      court: 'মেট্রোপলিটন সেশন জজ আদালত',
      hearingType: 'Bail Hearing',
      notes: 'জামিন শুনানি',
      responsibleStaffId: 'stf-4',
      lawyerId: 'law-2',
    },
    {
      id: 'hr-3',
      caseId: 'case-4',
      caseNumber: '321/2024',
      caseTitle: 'সালমা বেগম বনাম করিম মিয়া',
      hearingDate: '2026-09-12',
      hearingTime: '09:45',
      court: 'রাজশাহী পারিবারিক আদালত',
      hearingType: 'Evidence',
      notes: 'সাক্ষ্য গ্রহণ',
      responsibleStaffId: 'stf-7',
      lawyerId: 'law-4',
    },
    {
      id: 'hr-4',
      caseId: 'case-6',
      caseNumber: '112/2026',
      caseTitle: 'নূর জাহান বনাম সিটি কর্পোরেশন',
      hearingDate: '2026-09-25',
      hearingTime: '10:00',
      court: 'ঢাকা জেলা জজ আদালত',
      hearingType: 'Injunction',
      notes: 'স্থগিতাদেশ শুনানি',
      responsibleStaffId: 'stf-2',
      lawyerId: 'law-1',
    },
    {
      id: 'hr-5',
      caseId: 'case-3',
      caseNumber: '789/2026',
      caseTitle: 'মোঃ আলমগীর বনাম ব্যাংক এশিয়া',
      hearingDate: '2026-09-22',
      hearingTime: '12:00',
      court: 'চট্টগ্রাম জেলা জজ আদালত',
      hearingType: 'Mention',
      notes: 'প্রাথমিক শুনানি',
      responsibleStaffId: 'stf-6',
      lawyerId: 'law-3',
    },
    {
      id: 'hr-6',
      caseId: 'case-8',
      caseNumber: '220/2026',
      caseTitle: 'রিনা আক্তার বনাম শামীম রেজা',
      hearingDate: '2026-09-30',
      hearingTime: '11:30',
      court: 'ঢাকা পারিবারিক আদালত',
      hearingType: 'Evidence',
      notes: '',
      responsibleStaffId: 'stf-5',
      lawyerId: 'law-2',
    },
    {
      id: 'hr-7',
      caseId: 'case-1',
      caseNumber: '123/2026',
      caseTitle: 'করিম উদ্দিন বনাম রহিম মিয়া',
      hearingDate: '2026-10-08',
      hearingTime: '10:15',
      court: 'ঢাকা জেলা জজ আদালত',
      hearingType: 'Further Hearing',
      notes: 'পরবর্তী তারিখ',
      responsibleStaffId: 'stf-1',
      lawyerId: 'law-1',
    },
  ]

  const documents = [
    {
      id: 'doc-1',
      caseId: 'case-1',
      name: 'মূল পিটিশন',
      type: 'Petition',
      uploadDate: '2025-11-12',
      uploadedBy: 'অ্যাডভোকেট রফিকুল ইসলাম',
      fileType: 'PDF',
      isPublic: false,
    },
    {
      id: 'doc-2',
      caseId: 'case-1',
      name: 'আদালতের আদেশ — ০৫/০৮/২০২৬',
      type: 'Order',
      uploadDate: '2026-08-05',
      uploadedBy: 'মাহমুদ হাসান',
      fileType: 'PDF',
      isPublic: false,
    },
    {
      id: 'doc-3',
      caseId: 'case-2',
      name: 'জামিন আবেদন',
      type: 'Petition',
      uploadDate: '2026-08-20',
      uploadedBy: 'অ্যাডভোকেট সাবরিনা আহমেদ',
      fileType: 'DOCX',
      isPublic: false,
    },
  ]

  const tasks = [
    {
      id: 'task-1',
      title: 'সাক্ষী তালিকা প্রস্তুত',
      description: 'মামলা 123/2026 এর জন্য সাক্ষীদের তালিকা চূড়ান্ত করুন।',
      caseId: 'case-1',
      caseNumber: '123/2026',
      assignedStaffId: 'stf-1',
      lawyerId: 'law-1',
      dueDate: '2026-09-16',
      priority: 'High',
      status: 'In Progress',
    },
    {
      id: 'task-2',
      title: 'জামিন আবেদন ফাইল চেক',
      description: 'জামিন আবেদনের কাগজপত্র যাচাই।',
      caseId: 'case-2',
      caseNumber: '456/2025',
      assignedStaffId: 'stf-4',
      lawyerId: 'law-2',
      dueDate: '2026-09-14',
      priority: 'Urgent',
      status: 'Pending',
    },
    {
      id: 'task-3',
      title: 'স্থগিতাদেশ খসড়া',
      description: '112/2026 মামলার স্থগিতাদেশ আবেদন খসড়া।',
      caseId: 'case-6',
      caseNumber: '112/2026',
      assignedStaffId: 'stf-2',
      lawyerId: 'law-1',
      dueDate: '2026-09-20',
      priority: 'High',
      status: 'Pending',
    },
  ]

  const notifications = [
    {
      id: 'ntf-1',
      userId: 'law-1',
      role: 'LAWYER',
      title: 'আসন্ন শুনানি',
      message: 'মামলা 123/2026 — ১৮ সেপ্টেম্বর শুনানি নির্ধারিত।',
      type: 'hearing',
      read: false,
      createdAt: '2026-09-11T08:00:00',
      link: '/lawyer/hearings',
    },
    {
      id: 'ntf-2',
      userId: 'stf-1',
      role: 'STAFF',
      title: 'নতুন মামলা অ্যাসাইন',
      message: 'আপনাকে মামলা 123/2026 অ্যাসাইন করা হয়েছে।',
      type: 'case',
      read: false,
      createdAt: '2026-09-10T14:00:00',
      link: '/staff/cases',
    },
    {
      id: 'ntf-3',
      userId: 'law-1',
      role: 'LAWYER',
      title: 'নতুন টাস্ক অগ্রগতি',
      message: 'মাহমুদ হাসান সাক্ষী তালিকা প্রস্তুত করছেন।',
      type: 'task',
      read: false,
      createdAt: '2026-09-11T10:30:00',
      link: '/lawyer/tasks',
    },
  ]

  const adminPass = hashPassword('admin123')
  const admins = [
    {
      id: 'admin-1',
      userId: 'user-admin-1',
      name: 'NyayPath Admin',
      email: 'admin@nyaypath.bd',
      passwordHash: adminPass,
      photo: 'https://api.dicebear.com/9.x/initials/svg?seed=AD&backgroundColor=0c2e33',
      active: true,
    },
  ]

  const { divisions, courtTypes, courtEntries } = buildDefaultLocationCatalog()

  return {
    lawyers,
    staff,
    cases,
    hearings,
    documents,
    tasks,
    notifications,
    contacts: [],
    admins,
    divisions,
    courtTypes,
    courtEntries,
  }
}

function buildDefaultLocationCatalog() {
  const divisions = [
    { id: 'div-dhaka', name: 'ঢাকা', districts: ['ঢাকা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'মানিকগঞ্জ', 'মুন্সিগঞ্জ', 'নরসিংদী', 'টাঙ্গাইল', 'কিশোরগঞ্জ', 'ফরিদপুর', 'মাদারীপুর', 'শরীয়তপুর', 'রাজবাড়ী', 'গোপালগঞ্জ'] },
    { id: 'div-ctg', name: 'চট্টগ্রাম', districts: ['চট্টগ্রাম', 'কক্সবাজার', 'রাঙ্গামাটি', 'বান্দরবান', 'খাগড়াছড়ি', 'নোয়াখালী', 'ফেনী', 'লক্ষ্মীপুর', 'চাঁদপুর', 'কুমিল্লা', 'ব্রাহ্মণবাড়িয়া'] },
    { id: 'div-raj', name: 'রাজশাহী', districts: ['রাজশাহী', 'নাটোর', 'নওগাঁ', 'চাঁপাইনবাবগঞ্জ', 'পাবনা', 'সিরাজগঞ্জ', 'বগুড়া', 'জয়পুরহাট'] },
    { id: 'div-khu', name: 'খুলনা', districts: ['খুলনা', 'বাগেরহাট', 'সাতক্ষীরা', 'যশোর', 'ঝিনাইদহ', 'মাগুরা', 'নড়াইল', 'কুষ্টিয়া', 'চুয়াডাঙ্গা', 'মেহেরপুর'] },
    { id: 'div-bar', name: 'বরিশাল', districts: ['বরিশাল', 'ভোলা', 'পটুয়াখালী', 'পিরোজপুর', 'ঝালকাঠি', 'বরগুনা'] },
    { id: 'div-syl', name: 'সিলেট', districts: ['সিলেট', 'মৌলভীবাজার', 'হবিগঞ্জ', 'সুনামগঞ্জ'] },
    { id: 'div-ran', name: 'রংপুর', districts: ['রংপুর', 'দিনাজপুর', 'নীলফামারী', 'গাইবান্ধা', 'কুড়িগ্রাম', 'লালমনিরহাট', 'ঠাকুরগাঁও', 'পঞ্চগড়'] },
    { id: 'div-mym', name: 'ময়মনসিংহ', districts: ['ময়মনসিংহ', 'জামালপুর', 'শেরপুর', 'নেত্রকোণা'] },
  ]

  const courtTypes = [
    { id: 'ct-dj', value: 'district_judge', label: 'জেলা জজ আদালত' },
    { id: 'ct-ss', value: 'session', label: 'সেশন জজ আদালত' },
    { id: 'ct-cjm', value: 'cjm', label: 'চিফ জুডিশিয়াল ম্যাজিস্ট্রেট' },
    { id: 'ct-metro', value: 'metro', label: 'মেট্রোপলিটন আদালত' },
    { id: 'ct-hc', value: 'high_court', label: 'হাইকোর্ট / সুপ্রিম কোর্ট' },
    { id: 'ct-fam', value: 'family', label: 'পারিবারিক আদালত' },
    { id: 'ct-tri', value: 'tribunal', label: 'ট্রাইব্যুনাল' },
    { id: 'ct-lab', value: 'labour', label: 'শ্রম আদালত' },
  ]

  const courtEntries = []
  const pushCourt = (division, district, courtType, courtName) => {
    courtEntries.push({
      id: uid('crt'),
      division,
      district,
      courtType,
      courtName,
    })
  }

  for (const div of divisions) {
    for (const district of div.districts) {
      pushCourt(div.name, district, 'district_judge', `${district} জেলা জজ আদালত`)
      pushCourt(div.name, district, 'session', `${district} সেশন জজ আদালত`)
      pushCourt(div.name, district, 'cjm', `${district} চিফ জুডিশিয়াল ম্যাজিস্ট্রেট আদালত`)
      pushCourt(div.name, district, 'family', `${district} পারিবারিক আদালত`)
      pushCourt(div.name, district, 'tribunal', `নারী ও শিশু নির্যাতন দমন ট্রাইব্যুনাল, ${district}`)
    }
  }
  // notable extras
  pushCourt('ঢাকা', 'ঢাকা', 'high_court', 'হাইকোর্ট বিভাগ')
  pushCourt('ঢাকা', 'ঢাকা', 'high_court', 'সুপ্রিম কোর্ট অফ বাংলাদেশ')
  pushCourt('ঢাকা', 'ঢাকা', 'metro', 'ঢাকা মেট্রোপলিটন সেশন জজ আদালত')
  pushCourt('ঢাকা', 'ঢাকা', 'metro', 'ঢাকা চিফ মেট্রোপলিটন ম্যাজিস্ট্রেট আদালত')
  pushCourt('ঢাকা', 'ঢাকা', 'labour', 'ঢাকা শ্রম আদালত')

  return { divisions, courtTypes, courtEntries }
}

function ensureAdminCatalog(database) {
  let dirty = false
  if (!Array.isArray(database.admins) || database.admins.length === 0) {
    database.admins = [
      {
        id: 'admin-1',
        userId: 'user-admin-1',
        name: 'NyayPath Admin',
        email: 'admin@nyaypath.bd',
        passwordHash: hashPassword('admin123'),
        photo: 'https://api.dicebear.com/9.x/initials/svg?seed=AD&backgroundColor=0c2e33',
        active: true,
      },
    ]
    dirty = true
  }
  if (!Array.isArray(database.divisions) || database.divisions.length === 0) {
    const cat = buildDefaultLocationCatalog()
    database.divisions = cat.divisions
    database.courtTypes = cat.courtTypes
    database.courtEntries = cat.courtEntries
    dirty = true
  }
  database.contacts = database.contacts || []
  database.courtTypes = database.courtTypes || []
  database.courtEntries = database.courtEntries || []
  return dirty
}

function requireAdmin(auth) {
  return auth && auth.role === 'ADMIN'
}

function cascadeDeleteCase(database, caseId) {
  database.cases = database.cases.filter((c) => c.id !== caseId)
  database.hearings = (database.hearings || []).filter((h) => h.caseId !== caseId)
  database.tasks = (database.tasks || []).filter((t) => t.caseId !== caseId)
  database.documents = (database.documents || []).filter((d) => d.caseId !== caseId)
}

function cascadeDeleteLawyer(database, lawyerId) {
  database.lawyers = database.lawyers.filter((l) => l.id !== lawyerId)
  for (const s of database.staff || []) {
    if (s.lawyerId === lawyerId) s.lawyerId = ''
  }
  const orphanCaseIds = []
  for (const c of database.cases || []) {
    if (c.plaintiffLawyerId === lawyerId) {
      c.plaintiffLawyerId = undefined
      c.plaintiffLawyerName = ''
    }
    if (c.defendantLawyerId === lawyerId) {
      c.defendantLawyerId = undefined
      c.defendantLawyerName = ''
    }
    if (c.ownerLawyerId === lawyerId) {
      const other = c.plaintiffLawyerId || c.defendantLawyerId
      if (other) c.ownerLawyerId = other
      else orphanCaseIds.push(c.id)
    }
  }
  for (const id of orphanCaseIds) cascadeDeleteCase(database, id)
  database.hearings = (database.hearings || []).filter((h) => h.lawyerId !== lawyerId)
  database.tasks = (database.tasks || []).filter((t) => t.lawyerId !== lawyerId)
  database.notifications = (database.notifications || []).filter((n) => n.userId !== lawyerId)
}

function cascadeDeleteStaff(database, staffId) {
  unassignStaffFromWork(database, staffId)
  database.staff = database.staff.filter((s) => s.id !== staffId)
  database.notifications = (database.notifications || []).filter((n) => n.userId !== staffId)
}

function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}

function nextWorkingDayKey(from = new Date()) {
  const d = addDays(from, 1)
  while (d.getDay() === 5 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  return toDateKey(d)
}

function applyDemoHearingSchedule(database) {
  const today = toDateKey(new Date())
  const next = nextWorkingDayKey()
  const overdueA = toDateKey(addDays(new Date(), -5))
  const overdueB = toDateKey(addDays(new Date(), -12))
  const byId = (id) => database.cases.find((c) => c.id === id)

  const c1 = byId('case-1')
  if (c1) {
    c1.nextHearingDate = today
    c1.nextHearingPurpose = 'আর্গুমেন্ট'
    c1.status = 'Hearing Scheduled'
  }
  const c6 = byId('case-6')
  if (c6) {
    c6.nextHearingDate = next
    c6.nextHearingPurpose = 'স্থগিতাদেশ শুনানি'
    c6.status = 'Hearing Scheduled'
  }
  const c5 = byId('case-5')
  if (c5) {
    c5.nextHearingDate = overdueA
    c5.nextHearingPurpose = undefined
    c5.lastHearingDate = overdueA
    c5.status = 'Hearing Scheduled'
  }
  if (!database.cases.some((c) => c.id === 'case-11')) {
    database.cases.push({
      id: 'case-11',
      caseNumber: '901/2026',
      caseTitle: 'জাহিদা বেগম বনাম সিটি কর্পোরেশন',
      caseType: 'সিভিল',
      courtName: 'ঢাকা জেলা জজ আদালত',
      courtLocation: 'ঢাকা',
      filingDate: '2026-03-01',
      status: 'Hearing Scheduled',
      plaintiff: 'জাহিদা বেগম',
      defendant: 'ঢাকা উত্তর সিটি কর্পোরেশন',
      plaintiffLawyerId: 'law-1',
      plaintiffLawyerName: 'অ্যাডভোকেট রফিকুল ইসলাম',
      nextHearingDate: overdueB,
      lastHearingDate: overdueB,
      judgeName: 'বিচারক আব্দুল্লাহ আল মামুন',
      description: 'ইউটিলিটি সংযোগ বিরোধ — পরবর্তী তারিখ এন্ট্রি হয়নি।',
      assignedStaffIds: ['stf-1'],
      importantNotes: 'Staff তারিখ আপডেট করেনি।',
      privateNotes: '',
      ownerLawyerId: 'law-1',
    })
  }
  return database
}

function loadDbFromDisk() {
  if (!existsSync(DB_FILE)) {
    const seeded = applyDemoHearingSchedule(seedDb())
    writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf8')
    return seeded
  }
  return JSON.parse(readFileSync(DB_FILE, 'utf8'))
}

function saveDb(database) {
  db = database
  try {
    writeFileSync(DB_FILE, JSON.stringify(database, null, 2), 'utf8')
  } catch (err) {
    console.error('[DB] Local JSON save failed:', err.message)
  }
  if (isMongoConnected()) {
    saveStateToMongo(database).catch((err) => {
      console.error('[MongoDB] Save failed:', err.message)
    })
  }
}

let db = null

async function initDatabase() {
  try {
    await connectMongo()
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err.message)
    console.error('[MongoDB] Falling back to local JSON file.')
  }

  if (isMongoConnected()) {
    await prepareCollections()
    const fromMongo = await loadStateFromMongo()
    if (fromMongo && Array.isArray(fromMongo.cases) && fromMongo.lawyers?.length) {
      db = fromMongo
      db.contacts = db.contacts || []
      const dirtyStaff = ensureStaffCodes(db)
      const dirtyCases = ensureCaseLocations(db)
      const dirtyAdmin = ensureAdminCatalog(db)
      if (dirtyStaff || dirtyCases || dirtyAdmin) saveDb(db)
      else writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
      const counts = await getCollectionCounts()
      console.log('[MongoDB] Collections loaded:', counts)
      return
    }
    // First time / empty — seed into separate collections
    db = applyDemoHearingSchedule(seedDb())
    db.contacts = db.contacts || []
    ensureAdminCatalog(db)
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
    await saveStateToMongo(db)
    const counts = await getCollectionCounts()
    console.log('[MongoDB] Seeded into separate collections:', counts)
    console.log('[MongoDB] Browse in Atlas → Database: nyaypath')
    console.log(
      '[MongoDB]   lawyers | staff | cases | hearings | tasks | documents | notifications | contacts | admins | divisions | courtTypes | courtEntries',
    )
    return
  }

  db = loadDbFromDisk()
  applyDemoHearingSchedule(db)
  db.contacts = db.contacts || []
  const dirtyStaff = ensureStaffCodes(db)
  const dirtyCases = ensureCaseLocations(db)
  const dirtyAdmin = ensureAdminCatalog(db)
  if (dirtyStaff || dirtyCases || dirtyAdmin) saveDb(db)
  else writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
  console.log('[DB] Using local JSON:', DB_FILE)
}

function setCors(res, req) {
  const origin = (req && req.headers && req.headers.origin) || ''
  const allowed =
    !origin ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin === CORS_ORIGIN
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin || '*' : CORS_ORIGIN)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.setHeader('Vary', 'Origin')
}

function json(res, status, data, req) {
  setCors(res, req || { headers: {} })
  if (status === 204) {
    res.writeHead(204)
    res.end()
    return
  }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function getAuth(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return verifyToken(header.slice(7))
}

function publicLawyer(l) {
  return {
    id: l.id,
    fullName: l.fullName,
    email: l.visibility.email ? l.email : undefined,
    mobile: l.visibility.mobile ? l.mobile : undefined,
    barAssociation: l.barAssociation,
    enrollmentNumber: l.visibility.enrollmentNumber ? l.enrollmentNumber : undefined,
    practiceAreas: l.practiceAreas,
    practiceType: l.practiceType || 'both',
    court: l.court,
    division: l.division,
    district: l.district,
    chamberName: l.chamberName,
    chamberAddress: l.visibility.chamberAddress ? l.chamberAddress : undefined,
    chamberLocation: l.chamberLocation,
    bio: l.visibility.bio ? l.bio : undefined,
    photo: l.photo,
    yearsOfExperience: l.yearsOfExperience,
    designation: l.designation,
    publicProfileEnabled: l.publicProfileEnabled,
    verified: l.verified,
    visibility: l.visibility,
  }
}

function publicUserFromAuth(auth) {
  if (auth.role === 'LAWYER') {
    const l = db.lawyers.find((x) => x.id === auth.id)
    return l
      ? { id: l.id, name: l.fullName, email: l.email, role: 'LAWYER', photo: l.photo }
      : null
  }
  if (auth.role === 'ADMIN') {
    const a = (db.admins || []).find((x) => x.id === auth.id)
    return a
      ? { id: a.id, name: a.name, email: a.email, role: 'ADMIN', photo: a.photo }
      : null
  }
  const s = db.staff.find((x) => x.id === auth.id)
  return s
    ? {
        id: s.id,
        name: s.name,
        email: s.email,
        role: 'STAFF',
        photo: s.photo,
        lawyerId: s.lawyerId,
        staffCode: s.staffCode,
      }
    : null
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const path = url.pathname
  const method = req.method || 'GET'

  if (method === 'OPTIONS') {
    return json(res, 204, {}, req)
  }

  try {
    if (method === 'GET' && path === '/api/health') {
      const counts = isMongoConnected() ? await getCollectionCounts() : null
      return json(
        res,
        200,
        {
          ok: true,
          service: 'NyayPath API',
          time: new Date().toISOString(),
          mongo: isMongoConnected(),
          collections: counts,
          collectionMap: {
            lawyers: 'উকিল রেজিস্ট্রেশন',
            staff: 'স্টাফ রেজিস্ট্রেশন',
            cases: 'মামলা',
            hearings: 'শুনানি',
            tasks: 'টাস্ক',
            documents: 'ডকুমেন্ট',
            notifications: 'নোটিফিকেশন',
            contacts: 'কন্টাক্ট',
            admins: 'অ্যাডমিন',
            divisions: 'বিভাগ/জেলা',
            courtTypes: 'আদালতের ধরন',
            courtEntries: 'আদালত তালিকা',
          },
        },
        req,
      )
    }

    // Public location catalog (admin-managed)
    if (method === 'GET' && path === '/api/locations') {
      return json(
        res,
        200,
        {
          data: {
            divisions: db.divisions || [],
            courtTypes: db.courtTypes || [],
            courts: db.courtEntries || [],
          },
        },
        req,
      )
    }

    // Auth
    if (method === 'POST' && path === '/api/auth/login') {
      const body = await readBody(req)
      const email = String(body.email || '').trim().toLowerCase()
      const lawyer = db.lawyers.find((l) => l.email.toLowerCase() === email)
      if (lawyer && verifyPassword(body.password, lawyer.passwordHash)) {
        const token = signToken({ id: lawyer.id, role: 'LAWYER', userId: lawyer.userId })
        return json(res, 200, {
          token,
          user: { id: lawyer.id, name: lawyer.fullName, email: lawyer.email, role: 'LAWYER', photo: lawyer.photo },
        })
      }
      const staff = db.staff.find((s) => s.email.toLowerCase() === email)
      if (staff && verifyPassword(body.password, staff.passwordHash)) {
        if (!staff.staffCode) {
          staff.staffCode = makeStaffCode(db.staff.map((x) => x.staffCode))
          saveDb(db)
        }
        const token = signToken({ id: staff.id, role: 'STAFF', userId: staff.userId, lawyerId: staff.lawyerId || '' })
        return json(res, 200, {
          token,
          user: publicStaffUser(staff),
        })
      }
      const admin = (db.admins || []).find((a) => a.email.toLowerCase() === email && a.active !== false)
      if (admin && verifyPassword(body.password, admin.passwordHash)) {
        const token = signToken({ id: admin.id, role: 'ADMIN', userId: admin.userId })
        return json(res, 200, {
          token,
          user: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: 'ADMIN',
            photo: admin.photo,
          },
        })
      }
      return json(res, 401, { error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' }, req)
    }

    if (method === 'POST' && path === '/api/auth/register/staff') {
      const body = await readBody(req)
      if (!body.email || !body.name || !body.password) {
        return json(res, 400, { error: 'নাম, ইমেইল ও পাসওয়ার্ড আবশ্যক।' }, req)
      }
      const email = String(body.email).trim().toLowerCase()
      if (db.lawyers.some((l) => l.email.toLowerCase() === email) || db.staff.some((s) => s.email.toLowerCase() === email)) {
        return json(res, 409, { error: 'এই ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে।' }, req)
      }

      let lawyer = null
      if (body.lawyerId) {
        lawyer = db.lawyers.find((l) => l.id === body.lawyerId)
        if (!lawyer) return json(res, 404, { error: 'নির্বাচিত Lawyer পাওয়া যায়নি।' }, req)
      }

      const id = uid('stf')
      const staffCode = makeStaffCode(db.staff.map((s) => s.staffCode))
      const staff = {
        id,
        staffCode,
        userId: uid('user'),
        lawyerId: lawyer?.id || '',
        name: String(body.name).trim(),
        email,
        mobile: String(body.mobile || ''),
        passwordHash: hashPassword(body.password),
        role: body.role || 'Legal Assistant',
        active: true,
        photo:
          body.photo ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(body.name)}&backgroundColor=1a6b75`,
        permissions: defaultStaffPermissions(),
      }
      db.staff.push(staff)
      if (lawyer) {
        db.notifications.unshift({
          id: uid('ntf'),
          userId: lawyer.id,
          role: 'LAWYER',
          title: 'নতুন Staff রেজিস্ট্রেশন',
          message: `${staff.name} (${staff.staffCode}) আপনার অধীনে Staff অ্যাকাউন্ট খুলেছেন।`,
          type: 'staff',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/lawyer/staff',
        })
      }
      db.notifications.unshift({
        id: uid('ntf'),
        userId: staff.id,
        role: 'STAFF',
        title: 'স্বাগতম! আপনার Staff ID',
        message: lawyer
          ? `${lawyer.fullName}-এর অধীনে অ্যাকাউন্ট তৈরি হয়েছে। আপনার ইউনিক ID: ${staff.staffCode}`
          : `আপনার Staff অ্যাকাউন্ট তৈরি হয়েছে। ইউনিক ID: ${staff.staffCode} — এই ID/ইমেইল/মোবাইল দিয়ে উকিল আপনাকে অ্যাড করতে পারবেন।`,
        type: 'system',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/staff/profile',
      })
      saveDb(db)
      const token = signToken({ id: staff.id, role: 'STAFF', userId: staff.userId, lawyerId: staff.lawyerId || '' })
      return json(
        res,
        201,
        {
          token,
          user: publicStaffUser(staff),
        },
        req,
      )
    }

    if (method === 'POST' && path === '/api/auth/register/lawyer') {
      const body = await readBody(req)
      if (!body.email || !body.fullName || !body.password) {
        return json(res, 400, { error: 'প্রয়োজনীয় তথ্য পূরণ করুন।' })
      }
      if (db.lawyers.some((l) => l.email.toLowerCase() === body.email.toLowerCase())) {
        return json(res, 409, { error: 'এই ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে।' })
      }
      const id = uid('law')
      const practiceType =
        body.practiceType ||
        (String(body.practiceArea || '').includes('ফৌজদারি') ||
        String(body.practiceArea || '').toLowerCase().includes('criminal')
          ? 'criminal'
          : String(body.practiceArea || '').includes('উভয়')
            ? 'both'
            : 'civil')
      const practiceAreas =
        Array.isArray(body.practiceAreas) && body.practiceAreas.length
          ? body.practiceAreas
          : practiceType === 'criminal'
            ? ['ফৌজদারি']
            : practiceType === 'both'
              ? ['সিভিল', 'ফৌজদারি']
              : body.practiceArea
                ? [body.practiceArea]
                : ['সিভিল']

      const lawyer = {
        id,
        userId: uid('user'),
        fullName: body.fullName,
        email: body.email,
        mobile: body.mobile || '',
        passwordHash: hashPassword(body.password),
        barAssociation: body.barAssociation || '',
        enrollmentNumber: body.enrollmentNumber || '',
        practiceAreas,
        practiceType,
        court: body.court || '',
        division: body.division || '',
        district: body.district || body.court || '',
        chamberName: body.chamberName || '',
        chamberAddress: body.chamberAddress || '',
        chamberLocation: body.chamberLocation || '',
        bio: body.bio || '',
        photo:
          body.photo ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(body.fullName)}&backgroundColor=0c2e33`,
        yearsOfExperience: Number(body.yearsOfExperience) || 0,
        designation: 'অ্যাডভোকেট',
        publicProfileEnabled: body.publicProfileEnabled !== false,
        verified: false,
        visibility: {
          enrollmentNumber: true,
          mobile: true,
          email: true,
          chamberAddress: true,
          bio: true,
        },
      }
      db.lawyers.push(lawyer)
      saveDb(db)
      const token = signToken({ id: lawyer.id, role: 'LAWYER', userId: lawyer.userId })
      return json(res, 201, {
        token,
        user: { id: lawyer.id, name: lawyer.fullName, email: lawyer.email, role: 'LAWYER', photo: lawyer.photo },
      })
    }

    if (method === 'GET' && path === '/api/auth/me') {
      const auth = getAuth(req)
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      const user = publicUserFromAuth(auth)
      if (!user) return json(res, 404, { error: 'User not found' })
      return json(res, 200, { user })
    }

    // Lawyers public
    if (method === 'GET' && path === '/api/lawyers') {
      let list = db.lawyers.filter((l) => l.publicProfileEnabled)
      const name = url.searchParams.get('name')
      const district = url.searchParams.get('district')
      const court = url.searchParams.get('court')
      const practiceArea = url.searchParams.get('practiceArea')
      const practiceType = url.searchParams.get('practiceType')
      const experience = url.searchParams.get('experience')
      const bar = url.searchParams.get('bar')
      if (name) list = list.filter((l) => l.fullName.toLowerCase().includes(name.toLowerCase()))
      if (district) list = list.filter((l) => l.district === district)
      if (court) list = list.filter((l) => l.court.includes(court))
      if (practiceArea) list = list.filter((l) => l.practiceAreas.includes(practiceArea))
      if (practiceType) {
        list = list.filter((l) => {
          const t = l.practiceType || 'both'
          return t === practiceType
        })
      }
      if (bar) list = list.filter((l) => l.barAssociation === bar)
      if (experience) list = list.filter((l) => l.yearsOfExperience >= Number(experience))
      return json(res, 200, { data: list.map(publicLawyer) })
    }

    const lawyerMatch = path.match(/^\/api\/lawyers\/([^/]+)$/)
    if (method === 'GET' && lawyerMatch) {
      const l = db.lawyers.find((x) => x.id === lawyerMatch[1] && x.publicProfileEnabled)
      if (!l) return json(res, 404, { error: 'প্রোফাইল পাওয়া যায়নি' })
      return json(res, 200, { data: publicLawyer(l) })
    }

    // Public case search — সর্বনিম্ন: মামলা নম্বর + বিভাগ + জেলা
    if (method === 'GET' && path === '/api/cases/search') {
      const rawQ = (url.searchParams.get('q') || '').trim()
      const normalized = normalizeCaseNumber(rawQ)
      const q = (normalized.ok ? normalized.value : rawQ).toLowerCase()
      const division = (url.searchParams.get('division') || '').trim()
      const district = (url.searchParams.get('district') || '').trim()
      const courtType = (url.searchParams.get('courtType') || '').trim()
      const court = (url.searchParams.get('court') || '').trim()
      if (!q) return json(res, 400, { error: 'মামলা নম্বর আবশ্যক।' }, req)
      if (!division || !district) {
        return json(res, 400, { error: 'বিভাগ ও জেলা নির্বাচন আবশ্যক।' }, req)
      }
      ensureCaseLocations(db)
      const results = db.cases
        .filter((c) => matchesPublicCaseSearch(c, { q, division, district, courtType, court }))
        .map((c) => publicCaseView(c))
      return json(res, 200, { data: results }, req)
    }

    // Public case detail (no private fields)
    const publicCaseDetail = path.match(/^\/api\/cases\/search\/detail\/([^/]+)$/)
    if (method === 'GET' && publicCaseDetail) {
      ensureCaseLocations(db)
      const c = db.cases.find((x) => x.id === publicCaseDetail[1])
      if (!c) return json(res, 404, { error: 'মামলা পাওয়া যায়নি।' }, req)
      return json(
        res,
        200,
        {
          data: {
            ...c,
            privateNotes: undefined,
            importantNotes: undefined,
            assignedStaffIds: [],
          },
        },
        req,
      )
    }

    // Protected routes below
    const auth = getAuth(req)

    // Disabled staff — শুধু /staff/me ও leave API চলবে
    if (auth?.role === 'STAFF') {
      const meStaff = getStaffRecord(auth)
      const allowedWhenDisabled =
        (method === 'GET' && path === '/api/staff/me') ||
        (method === 'POST' && path === '/api/staff/me/leave') ||
        (method === 'DELETE' && path === '/api/staff/me')
      if (staffIsBlocked(meStaff) && !allowedWhenDisabled) {
        return json(
          res,
          403,
          {
            error: 'আপনার অ্যাকাউন্ট Disabled। উকিলের মামলা/টাস্ক ব্যবহার করা যাবে না।',
            code: 'STAFF_DISABLED',
          },
          req,
        )
      }
    }

    if (method === 'GET' && path === '/api/cases') {
      if (!auth) return json(res, 401, { error: 'Unauthorized' }, req)
      let list = []
      if (auth.role === 'LAWYER') {
        list = db.cases.filter((c) => lawyerCanAccessCase(c, auth.id))
      } else if (auth.role === 'STAFF') {
        list = db.cases.filter((c) => (c.assignedStaffIds || []).includes(auth.id))
      } else return json(res, 403, { error: 'Forbidden' }, req)
      return json(res, 200, { data: list }, req)
    }

    // Lookup existing case before/during entry (same number + location)
    if (method === 'GET' && path === '/api/cases/match') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' }, req)
      const num = normalizeCaseNumber(url.searchParams.get('q') || '')
      if (!num.ok) return json(res, 400, { error: num.error }, req)
      const division = (url.searchParams.get('division') || '').trim()
      const district = (url.searchParams.get('district') || '').trim()
      const courtName = (url.searchParams.get('court') || url.searchParams.get('courtName') || '').trim()
      if (!division || !district || !courtName) {
        return json(res, 400, { error: 'বিভাগ, জেলা ও আদালত দিন।' }, req)
      }
      const found = findMatchingCase(db, {
        caseNumber: num.value,
        division,
        district,
        courtName,
      })
      if (!found) return json(res, 200, { data: null }, req)
      return json(
        res,
        200,
        {
          data: {
            id: found.id,
            caseNumber: found.caseNumber,
            caseTitle: found.caseTitle,
            plaintiff: found.plaintiff,
            defendant: found.defendant,
            plaintiffLawyerId: found.plaintiffLawyerId || '',
            defendantLawyerId: found.defendantLawyerId || '',
            plaintiffLawyerName: found.plaintiffLawyerName || '',
            defendantLawyerName: found.defendantLawyerName || '',
            division: found.division,
            district: found.district,
            courtName: found.courtName,
            status: found.status,
          },
        },
        req,
      )
    }

    const caseMatch = path.match(/^\/api\/cases\/([^/]+)$/)
    if (method === 'GET' && caseMatch) {
      if (!auth) return json(res, 401, { error: 'Unauthorized' }, req)
      const c = db.cases.find((x) => x.id === caseMatch[1])
      if (!c) return json(res, 404, { error: 'Case not found' }, req)
      const staffIds = Array.isArray(c.assignedStaffIds) ? c.assignedStaffIds : []
      const allowed =
        (auth.role === 'LAWYER' && lawyerCanAccessCase(c, auth.id)) ||
        (auth.role === 'STAFF' && staffIds.includes(auth.id))
      if (!allowed) return json(res, 403, { error: 'Forbidden' }, req)
      return json(res, 200, { data: { ...c, assignedStaffIds: staffIds } }, req)
    }

    if (method === 'POST' && path === '/api/cases') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' }, req)
      const body = await readBody(req)
      if (!body.caseNumber || !body.caseTitle || !body.courtName) {
        return json(res, 400, { error: 'মামলা নম্বর, শিরোনাম ও আদালত আবশ্যক।' }, req)
      }
      const num = normalizeCaseNumber(body.caseNumber)
      if (!num.ok) return json(res, 400, { error: num.error }, req)

      const assignedStaffIds = Array.isArray(body.assignedStaffIds)
        ? body.assignedStaffIds.filter(Boolean)
        : body.assignedStaffId
          ? [body.assignedStaffId]
          : []
      const courtLocation = String(body.courtLocation || body.district || '').trim()
      const district = String(body.district || courtLocation || '').trim()
      const division =
        String(body.division || '').trim() || findDivisionByDistrictName(district) || ''
      const courtName = String(body.courtName).trim()
      const side = body.representingSide === 'defendant' ? 'defendant' : 'plaintiff'
      const lawyer = db.lawyers.find((l) => l.id === auth.id)
      const myName = lawyer?.fullName || ''

      const matchKey = { caseNumber: num.value, division, district, courtName }
      const existing = findMatchingCase(db, matchKey)

      // —— একই মামলা আগে এন্ট্রি থাকলে মার্জ / রিপ্লেস ——
      if (existing) {
        const prevPlaintiffId = existing.plaintiffLawyerId
        const prevDefendantId = existing.defendantLawyerId
        const alreadyOnOtherSide =
          (side === 'plaintiff' && existing.defendantLawyerId === auth.id) ||
          (side === 'defendant' && existing.plaintiffLawyerId === auth.id)
        if (alreadyOnOtherSide) {
          return json(
            res,
            409,
            { error: 'আপনি ইতিমধ্যে এই মামলার অন্য পক্ষে আছেন। একজন উকিল দুই পক্ষে থাকতে পারেন না।' },
            req,
          )
        }

        // একই পক্ষে অন্য উকিল থাকলে কেটে নতুন উকিল বসান
        const prevOnSide = side === 'plaintiff' ? prevPlaintiffId : prevDefendantId
        if (prevOnSide && prevOnSide !== auth.id) {
          clearLawyerFromSide(existing, side)
          db.notifications.unshift({
            id: uid('ntf'),
            userId: prevOnSide,
            role: 'LAWYER',
            title: 'মামলা থেকে সরানো হয়েছে',
            message: `${num.value} মামলায় আপনার স্থানে অন্য উকিল নিযুক্ত হয়েছেন।`,
            type: 'case',
            read: false,
            createdAt: new Date().toISOString(),
            link: '/lawyer/cases',
          })
        }

        assignLawyerToSide(existing, side, auth.id, myName)
        // shared fields refresh (safe)
        if (body.caseTitle) existing.caseTitle = String(body.caseTitle).trim()
        if (body.plaintiff) existing.plaintiff = String(body.plaintiff).trim()
        if (body.defendant) existing.defendant = String(body.defendant).trim()
        if (body.nextHearingDate) existing.nextHearingDate = body.nextHearingDate
        if (body.status) existing.status = body.status
        if (body.judgeName) existing.judgeName = body.judgeName
        if (body.description) existing.description = body.description
        existing.caseNumber = num.value
        existing.division = division
        existing.district = district
        existing.courtName = courtName
        existing.courtLocation = courtLocation
        if (!existing.ownerLawyerId) existing.ownerLawyerId = auth.id

        // opposite lawyer auto — already on record; notify opposite if present
        const oppositeId = side === 'plaintiff' ? existing.defendantLawyerId : existing.plaintiffLawyerId
        if (oppositeId && oppositeId !== auth.id) {
          db.notifications.unshift({
            id: uid('ntf'),
            userId: oppositeId,
            role: 'LAWYER',
            title: 'বিপরীত পক্ষের উকিল যোগ হয়েছেন',
            message: `${num.value} মামলায় ${myName} ${side === 'plaintiff' ? 'বাদীপক্ষ' : 'বিবাদীপক্ষ'} হিসেবে যোগ দিয়েছেন।`,
            type: 'case',
            read: false,
            createdAt: new Date().toISOString(),
            link: `/lawyer/cases/${existing.id}`,
          })
        }

        saveDb(db)
        return json(
          res,
          200,
          {
            data: existing,
            merged: true,
            message:
              oppositeId
                ? 'একই মামলায় যোগ হয়েছে — বিপরীত পক্ষের উকিল অটো সংযুক্ত।'
                : prevOnSide && prevOnSide !== auth.id
                  ? 'আগের উকিল সরিয়ে আপনি এই পক্ষে নিযুক্ত হয়েছেন।'
                  : 'মামলা আপডেট হয়েছে।',
          },
          req,
        )
      }

      // —— নতুন মামলা ——
      const created = {
        id: uid('case'),
        caseNumber: num.value,
        caseTitle: String(body.caseTitle).trim(),
        caseType: body.caseType || 'সিভিল স্যুট',
        courtName,
        courtLocation,
        division,
        district,
        courtType: body.courtType || '',
        filingDate: body.filingDate || new Date().toISOString().slice(0, 10),
        status: body.status || (body.nextHearingDate ? 'Hearing Scheduled' : 'Active'),
        plaintiff: String(body.plaintiff || '').trim(),
        defendant: String(body.defendant || '').trim(),
        representingSide: side,
        plaintiffLawyerName: side === 'plaintiff' ? myName : '',
        defendantLawyerName: side === 'defendant' ? myName : '',
        plaintiffLawyerId: side === 'plaintiff' ? auth.id : undefined,
        defendantLawyerId: side === 'defendant' ? auth.id : undefined,
        nextHearingDate: body.nextHearingDate || '',
        nextHearingPurpose: body.nextHearingPurpose || '',
        judgeName: body.judgeName || '',
        description: body.description || '',
        assignedStaffIds,
        importantNotes: body.importantNotes || '',
        privateNotes: body.privateNotes || '',
        ownerLawyerId: auth.id,
      }
      db.cases.push(created)
      if (created.nextHearingDate) {
        db.hearings.push({
          id: uid('hr'),
          caseId: created.id,
          caseNumber: created.caseNumber,
          caseTitle: created.caseTitle,
          hearingDate: created.nextHearingDate,
          hearingTime: body.hearingTime || '10:00',
          court: created.courtName,
          hearingType: body.hearingType || 'শুনানি',
          notes: created.nextHearingPurpose || '',
          responsibleStaffId: assignedStaffIds[0] || '',
          lawyerId: auth.id,
        })
      }
      saveDb(db)
      return json(res, 201, { data: created, merged: false }, req)
    }

    // উকিল মামলা পরিচালনা বন্ধ → সেই পক্ষের নাম কেটে যায়
    const withdrawMatch = path.match(/^\/api\/cases\/([^/]+)\/withdraw$/)
    if (method === 'POST' && withdrawMatch) {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' }, req)
      const c = db.cases.find((x) => x.id === withdrawMatch[1])
      if (!c) return json(res, 404, { error: 'Case not found' }, req)
      const onPlaintiff = c.plaintiffLawyerId === auth.id
      const onDefendant = c.defendantLawyerId === auth.id
      if (!onPlaintiff && !onDefendant) {
        return json(res, 400, { error: 'আপনি এই মামলার কোনো পক্ষে নিযুক্ত নন।' }, req)
      }
      if (onPlaintiff) clearLawyerFromSide(c, 'plaintiff')
      if (onDefendant) clearLawyerFromSide(c, 'defendant')
      // কেউ না থাকলে Closed মার্ক (ঐচ্ছিক কিন্তু স্পষ্ট)
      if (!c.plaintiffLawyerId && !c.defendantLawyerId) {
        c.status = 'Closed'
      }
      const oppositeId = onPlaintiff ? c.defendantLawyerId : c.plaintiffLawyerId
      if (oppositeId) {
        db.notifications.unshift({
          id: uid('ntf'),
          userId: oppositeId,
          role: 'LAWYER',
          title: 'বিপরীত পক্ষের উকিল সরেছেন',
          message: `${c.caseNumber} মামলায় একজন উকিল পরিচালনা বন্ধ করেছেন।`,
          type: 'case',
          read: false,
          createdAt: new Date().toISOString(),
          link: `/lawyer/cases/${c.id}`,
        })
      }
      saveDb(db)
      return json(res, 200, { data: c, message: 'আপনি এই মামলা থেকে সরে গেছেন।' }, req)
    }

    if (method === 'PUT' && caseMatch) {
      if (!auth) return json(res, 401, { error: 'Unauthorized' }, req)
      const idx = db.cases.findIndex((x) => x.id === caseMatch[1])
      if (idx < 0) return json(res, 404, { error: 'Case not found' }, req)
      const existing = db.cases[idx]
      if (auth.role === 'LAWYER' && !lawyerCanAccessCase(existing, auth.id)) {
        return json(res, 403, { error: 'Forbidden' }, req)
      }
      if (auth.role === 'STAFF') {
        const staff = db.staff.find((s) => s.id === auth.id)
        if (!staff?.permissions.editCases || !existing.assignedStaffIds.includes(auth.id)) {
          return json(res, 403, { error: 'Forbidden' }, req)
        }
      }
      const body = await readBody(req)
      if (body.caseNumber) {
        const num = normalizeCaseNumber(body.caseNumber)
        if (!num.ok) return json(res, 400, { error: num.error }, req)
        body.caseNumber = num.value
      }
      // Closed by this lawyer = withdraw their side, don't wipe opposite
      if (body.status === 'Closed' && auth.role === 'LAWYER') {
        if (existing.plaintiffLawyerId === auth.id) clearLawyerFromSide(existing, 'plaintiff')
        if (existing.defendantLawyerId === auth.id) clearLawyerFromSide(existing, 'defendant')
        if (!existing.plaintiffLawyerId && !existing.defendantLawyerId) {
          existing.status = 'Closed'
        } else {
          delete body.status
        }
      }
      db.cases[idx] = {
        ...existing,
        ...body,
        id: existing.id,
        ownerLawyerId: existing.ownerLawyerId,
        plaintiffLawyerId: existing.plaintiffLawyerId,
        defendantLawyerId: existing.defendantLawyerId,
        plaintiffLawyerName: existing.plaintiffLawyerName,
        defendantLawyerName: existing.defendantLawyerName,
      }
      saveDb(db)
      return json(res, 200, { data: db.cases[idx] }, req)
    }

    const nextHearingMatch = path.match(/^\/api\/cases\/([^/]+)\/next-hearing$/)
    if (method === 'PATCH' && nextHearingMatch) {
      if (!auth) return json(res, 401, { error: 'Unauthorized' }, req)
      const idx = db.cases.findIndex((x) => x.id === nextHearingMatch[1])
      if (idx < 0) return json(res, 404, { error: 'Case not found' }, req)
      const existing = db.cases[idx]
      if (auth.role === 'LAWYER' && existing.ownerLawyerId !== auth.id) {
        return json(res, 403, { error: 'Forbidden' }, req)
      }
      if (auth.role === 'STAFF') {
        const staff = db.staff.find((s) => s.id === auth.id)
        const allowed =
          staff &&
          existing.assignedStaffIds.includes(auth.id) &&
          (staff.permissions.editHearingDates || staff.permissions.editCases)
        if (!allowed) return json(res, 403, { error: 'Forbidden' }, req)
      }
      const body = await readBody(req)
      if (!body.nextHearingDate || !body.nextHearingPurpose) {
        return json(res, 400, { error: 'পরবর্তী তারিখ এবং সেদিন কী হবে — দুটোই আবশ্যক।' }, req)
      }
      const day = new Date(String(body.nextHearingDate).slice(0, 10) + 'T00:00:00')
      if (day.getDay() === 5 || day.getDay() === 6) {
        return json(res, 400, { error: 'শুক্রবার/শনিবার আদালত বন্ধ।' }, req)
      }
      db.cases[idx] = {
        ...existing,
        lastHearingDate: existing.nextHearingDate,
        nextHearingDate: String(body.nextHearingDate).slice(0, 10),
        nextHearingPurpose: String(body.nextHearingPurpose),
        status: 'Hearing Scheduled',
        importantNotes: body.notes
          ? `${body.notes}${existing.importantNotes ? ` | ${existing.importantNotes}` : ''}`
          : existing.importantNotes,
      }
      db.hearings.push({
        id: uid('hr'),
        caseId: existing.id,
        caseNumber: existing.caseNumber,
        caseTitle: existing.caseTitle,
        hearingDate: String(body.nextHearingDate).slice(0, 10),
        hearingTime: body.hearingTime || '10:30',
        court: existing.courtName,
        hearingType: String(body.nextHearingPurpose),
        notes: body.notes || '',
        responsibleStaffId: existing.assignedStaffIds?.[0],
        lawyerId: existing.ownerLawyerId,
      })
      saveDb(db)
      return json(res, 200, { data: db.cases[idx] }, req)
    }

    if (method === 'GET' && path === '/api/staff') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' }, req)
      const list = db.staff
        .filter((s) => s.lawyerId === auth.id)
        .map(({ passwordHash, ...rest }) => rest)
      return json(res, 200, { data: list }, req)
    }

    if (method === 'GET' && path === '/api/staff/me') {
      if (!auth || auth.role !== 'STAFF') return json(res, 403, { error: 'Forbidden' }, req)
      const s = db.staff.find((x) => x.id === auth.id)
      if (!s) return json(res, 404, { error: 'Staff not found' }, req)
      const lawyer = db.lawyers.find((l) => l.id === s.lawyerId)
      const { passwordHash, ...safe } = s
      return json(
        res,
        200,
        {
          data: {
            ...safe,
            lawyerName: lawyer?.fullName || '',
            lawyerChamber: lawyer?.chamberName || '',
          },
        },
        req,
      )
    }

    if (method === 'GET' && path === '/api/staff/lookup') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' }, req)
      const q = url.searchParams.get('q') || ''
      const found = findStaffByQuery(db, q)
      if (!found) return json(res, 404, { error: 'এই ID / ইমেইল / নাম্বারে কোনো Staff পাওয়া যায়নি।' }, req)
      return json(
        res,
        200,
        {
          data: {
            id: found.id,
            staffCode: found.staffCode,
            name: found.name,
            email: found.email,
            mobile: found.mobile,
            photo: found.photo,
            role: found.role,
            lawyerId: found.lawyerId || '',
            linked: Boolean(found.lawyerId),
            linkedToYou: found.lawyerId === auth.id,
          },
        },
        req,
      )
    }

    if (method === 'POST' && path === '/api/staff/link') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' }, req)
      const body = await readBody(req)
      const query = body.query || body.staffCode || body.email || body.mobile || ''
      const found = body.staffId
        ? db.staff.find((s) => s.id === body.staffId)
        : findStaffByQuery(db, query)
      if (!found) return json(res, 404, { error: 'এই ID / ইমেইল / নাম্বারে কোনো Staff পাওয়া যায়নি।' }, req)
      if (found.lawyerId && found.lawyerId !== auth.id) {
        return json(res, 409, { error: 'এই Staff ইতিমধ্যে অন্য উকিলের অধীনে আছেন।' }, req)
      }
      const wasUnlinked = !found.lawyerId
      found.lawyerId = auth.id
      found.role = body.role || found.role || 'Legal Assistant'
      found.permissions = body.permissions
        ? { ...defaultStaffPermissions(), ...body.permissions }
        : found.permissions || defaultStaffPermissions()
      // নতুন লিংকেই Active — আগে Disabled থাকলে re-add করে অটো Active হবে না
      if (wasUnlinked) {
        found.active = body.active === undefined ? true : Boolean(body.active)
      } else if (typeof body.active === 'boolean') {
        found.active = body.active
      }
      if (!found.staffCode) found.staffCode = makeStaffCode(db.staff.map((s) => s.staffCode))
      db.notifications.unshift({
        id: uid('ntf'),
        userId: found.id,
        role: 'STAFF',
        title: 'উকিল আপনাকে যোগ করেছেন',
        message: `একজন উকিল আপনাকে টিমে যোগ করেছেন। আপনার ID: ${found.staffCode}`,
        type: 'staff',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/staff/dashboard',
      })
      db.notifications.unshift({
        id: uid('ntf'),
        userId: auth.id,
        role: 'LAWYER',
        title: 'স্টাফ যোগ হয়েছে',
        message: `${found.name} (${found.staffCode})-কে যোগ করা হয়েছে।`,
        type: 'staff',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/lawyer/staff',
      })
      saveDb(db)
      const { passwordHash, ...safe } = found
      return json(res, 200, { data: safe }, req)
    }

    if (method === 'POST' && path === '/api/staff') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' }, req)
      const body = await readBody(req)
      // Prefer linking an existing registered staff by ID / email / mobile
      if (body.query || body.staffCode || body.email || body.mobile || body.staffId) {
        const query = body.query || body.staffCode || body.email || body.mobile || ''
        const found = body.staffId
          ? db.staff.find((s) => s.id === body.staffId)
          : findStaffByQuery(db, query)
        if (!found) return json(res, 404, { error: 'এই ID / ইমেইল / নাম্বারে কোনো Staff পাওয়া যায়নি।' }, req)
        if (found.lawyerId && found.lawyerId !== auth.id) {
          return json(res, 409, { error: 'এই Staff ইতিমধ্যে অন্য উকিলের অধীনে আছেন।' }, req)
        }
        const wasUnlinked = !found.lawyerId
        found.lawyerId = auth.id
        found.role = body.role || found.role || 'Legal Assistant'
        found.permissions = body.permissions
          ? { ...defaultStaffPermissions(), ...body.permissions }
          : found.permissions || defaultStaffPermissions()
        if (wasUnlinked) found.active = true
        if (!found.staffCode) found.staffCode = makeStaffCode(db.staff.map((s) => s.staffCode))
        saveDb(db)
        const { passwordHash, ...safe } = found
        return json(res, 200, { data: safe }, req)
      }
      return json(
        res,
        400,
        { error: 'Staff-এর ইউনিক ID, ইমেইল বা মোবাইল নম্বর দিন। Staff আগে নিজে অ্যাকাউন্ট খুলবেন।' },
        req,
      )
    }

    // Staff নিজে টিম ছেড়ে যাওয়া / ডিলিট
    if (method === 'POST' && path === '/api/staff/me/leave') {
      if (!auth || auth.role !== 'STAFF') return json(res, 403, { error: 'Forbidden' }, req)
      const s = db.staff.find((x) => x.id === auth.id)
      if (!s) return json(res, 404, { error: 'Staff not found' }, req)
      detachStaffFromLawyer(db, s.id)
      saveDb(db)
      return json(res, 200, { ok: true, message: 'উকিলের টিম থেকে বেরিয়ে এসেছেন। মামলার লিংক মুছে গেছে।' }, req)
    }

    if (method === 'DELETE' && path === '/api/staff/me') {
      if (!auth || auth.role !== 'STAFF') return json(res, 403, { error: 'Forbidden' }, req)
      const s = db.staff.find((x) => x.id === auth.id)
      if (!s) return json(res, 404, { error: 'Staff not found' }, req)
      cascadeDeleteStaff(db, s.id)
      saveDb(db)
      return json(res, 200, { ok: true, message: 'অ্যাকাউন্ট ডিলিট হয়েছে।' }, req)
    }

    const staffMatch = path.match(/^\/api\/staff\/([^/]+)$/)
    if (method === 'GET' && staffMatch) {
      if (!auth) return json(res, 401, { error: 'Unauthorized' }, req)
      const s = db.staff.find((x) => x.id === staffMatch[1])
      if (!s) return json(res, 404, { error: 'Staff not found' }, req)
      if (auth.role === 'LAWYER' && s.lawyerId !== auth.id) return json(res, 403, { error: 'Forbidden' }, req)
      if (auth.role === 'STAFF' && s.id !== auth.id) return json(res, 403, { error: 'Forbidden' }, req)
      const { passwordHash, ...safe } = s
      return json(res, 200, { data: safe }, req)
    }

    if (method === 'PATCH' && staffMatch) {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' }, req)
      const s = db.staff.find((x) => x.id === staffMatch[1] && x.lawyerId === auth.id)
      if (!s) return json(res, 404, { error: 'Staff not found' }, req)
      const body = await readBody(req)
      if (body.role) s.role = body.role
      if (typeof body.active === 'boolean') s.active = body.active
      if (body.permissions && typeof body.permissions === 'object') {
        s.permissions = { ...defaultStaffPermissions(), ...s.permissions, ...body.permissions }
      }
      saveDb(db)
      const { passwordHash, ...safe } = s
      return json(res, 200, { data: safe }, req)
    }

    // উকিল Staff ডিলিট → মামলা উকিলের কাছে, Staff অ্যাকাউন্ট আলাদা
    if (method === 'DELETE' && staffMatch) {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' }, req)
      const s = db.staff.find((x) => x.id === staffMatch[1] && x.lawyerId === auth.id)
      if (!s) return json(res, 404, { error: 'Staff not found' }, req)
      detachStaffFromLawyer(db, s.id)
      db.notifications.unshift({
        id: uid('ntf'),
        userId: s.id,
        role: 'STAFF',
        title: 'টিম থেকে সরানো হয়েছে',
        message: 'উকিল আপনাকে টিম থেকে ডিলিট করেছেন। অ্যাসাইন মামলার তথ্য আর দেখা যাবে না।',
        type: 'staff',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/staff/profile',
      })
      saveDb(db)
      return json(res, 200, { ok: true, message: 'Staff সরানো হয়েছে। মামলা এখন উকিল নিজে পরিচালনা করবেন।' }, req)
    }

    const staffAccess = path.match(/^\/api\/staff\/([^/]+)\/access$/)
    if (method === 'PATCH' && staffAccess) {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' }, req)
      const s = db.staff.find((x) => x.id === staffAccess[1] && x.lawyerId === auth.id)
      if (!s) return json(res, 404, { error: 'Staff not found' }, req)
      const body = await readBody(req)
      s.active = Boolean(body.active)
      saveDb(db)
      const { passwordHash, ...safe } = s
      return json(res, 200, { data: safe }, req)
    }

    if (method === 'GET' && path === '/api/hearings') {
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      let list = []
      if (auth.role === 'LAWYER') list = db.hearings.filter((h) => h.lawyerId === auth.id)
      else list = db.hearings.filter((h) => h.responsibleStaffId === auth.id)
      return json(res, 200, { data: list })
    }

    if (method === 'POST' && path === '/api/hearings') {
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      const body = await readBody(req)
      const caseItem = db.cases.find((c) => c.id === body.caseId)
      if (!caseItem) return json(res, 404, { error: 'Case not found' })
      const created = {
        id: uid('hr'),
        caseId: body.caseId,
        caseNumber: caseItem.caseNumber,
        caseTitle: caseItem.caseTitle,
        hearingDate: body.hearingDate,
        hearingTime: body.hearingTime,
        court: body.court,
        hearingType: body.hearingType,
        notes: body.notes || '',
        responsibleStaffId: body.responsibleStaffId,
        lawyerId: auth.role === 'LAWYER' ? auth.id : caseItem.ownerLawyerId,
      }
      db.hearings.push(created)
      caseItem.nextHearingDate = body.hearingDate
      caseItem.status = 'Hearing Scheduled'
      saveDb(db)
      return json(res, 201, { data: created })
    }

    if (method === 'GET' && path === '/api/tasks') {
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      let list = []
      if (auth.role === 'LAWYER') list = db.tasks.filter((t) => t.lawyerId === auth.id)
      else list = db.tasks.filter((t) => t.assignedStaffId === auth.id)
      return json(res, 200, { data: list })
    }

    if (method === 'POST' && path === '/api/tasks') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' })
      const body = await readBody(req)
      const caseItem = db.cases.find((c) => c.id === body.caseId)
      const created = {
        id: uid('task'),
        title: body.title,
        description: body.description || '',
        caseId: body.caseId,
        caseNumber: caseItem?.caseNumber || '',
        assignedStaffId: body.assignedStaffId || '',
        lawyerId: auth.id,
        dueDate: body.dueDate,
        priority: body.priority || 'Medium',
        status: 'Pending',
      }
      db.tasks.push(created)
      if (body.assignedStaffId) {
        db.notifications.unshift({
          id: uid('ntf'),
          userId: body.assignedStaffId,
          role: 'STAFF',
          title: 'নতুন টাস্ক অ্যাসাইন',
          message: body.title,
          type: 'task',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/staff/tasks',
        })
      }
      saveDb(db)
      return json(res, 201, { data: created })
    }

    const taskStatus = path.match(/^\/api\/tasks\/([^/]+)\/status$/)
    if (method === 'PATCH' && taskStatus) {
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      const t = db.tasks.find((x) => x.id === taskStatus[1])
      if (!t) return json(res, 404, { error: 'Task not found' })
      const body = await readBody(req)
      t.status = body.status || t.status
      saveDb(db)
      return json(res, 200, { data: t })
    }

    if (method === 'GET' && path === '/api/documents') {
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      let caseIds = new Set()
      if (auth.role === 'LAWYER') {
        db.cases.filter((c) => c.ownerLawyerId === auth.id).forEach((c) => caseIds.add(c.id))
      } else {
        db.cases.filter((c) => c.assignedStaffIds.includes(auth.id)).forEach((c) => caseIds.add(c.id))
      }
      return json(res, 200, { data: db.documents.filter((d) => caseIds.has(d.caseId)) })
    }

    if (method === 'POST' && path === '/api/documents') {
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      const body = await readBody(req)
      const user = publicUserFromAuth(auth)
      const created = {
        id: uid('doc'),
        caseId: body.caseId,
        name: body.name,
        type: body.type || 'Other',
        uploadDate: new Date().toISOString().slice(0, 10),
        uploadedBy: user?.name || 'User',
        fileType: body.fileType || 'PDF',
        isPublic: false,
      }
      db.documents.push(created)
      saveDb(db)
      return json(res, 201, { data: created })
    }

    if (method === 'GET' && path === '/api/notifications') {
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      const list = db.notifications
        .filter((n) => n.userId === auth.id)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      return json(res, 200, { data: list })
    }

    if (method === 'GET' && path === '/api/profile/lawyer') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' })
      const l = db.lawyers.find((x) => x.id === auth.id)
      if (!l) return json(res, 404, { error: 'Profile not found' })
      const { passwordHash, ...safe } = l
      return json(res, 200, { data: safe })
    }

    if (method === 'PUT' && path === '/api/profile/lawyer') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' })
      const idx = db.lawyers.findIndex((x) => x.id === auth.id)
      if (idx < 0) return json(res, 404, { error: 'Profile not found' })
      const body = await readBody(req)
      db.lawyers[idx] = {
        ...db.lawyers[idx],
        ...body,
        id: db.lawyers[idx].id,
        email: db.lawyers[idx].email,
        passwordHash: db.lawyers[idx].passwordHash,
      }
      saveDb(db)
      return json(res, 200, { data: { id: db.lawyers[idx].id, fullName: db.lawyers[idx].fullName } })
    }

    if (method === 'GET' && path === '/api/dashboard/lawyer') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' })
      const myCases = db.cases.filter((c) => c.ownerLawyerId === auth.id)
      const myHearings = db.hearings.filter((h) => h.lawyerId === auth.id)
      const today = new Date().toISOString().slice(0, 10)
      return json(res, 200, {
        data: {
          totalCases: myCases.length,
          activeCases: myCases.filter((c) => c.status === 'Active' || c.status === 'Hearing Scheduled').length,
          upcomingHearings: myHearings.filter((h) => h.hearingDate >= today).length,
          todayHearings: myHearings.filter((h) => h.hearingDate === today).length,
          totalStaff: db.staff.filter((s) => s.lawyerId === auth.id && s.active).length,
          pendingTasks: db.tasks.filter((t) => t.lawyerId === auth.id && t.status !== 'Completed').length,
        },
      })
    }

    if (method === 'GET' && path === '/api/dashboard/staff') {
      if (!auth || auth.role !== 'STAFF') return json(res, 403, { error: 'Forbidden' })
      const today = new Date().toISOString().slice(0, 10)
      const myHearings = db.hearings.filter((h) => h.responsibleStaffId === auth.id)
      return json(res, 200, {
        data: {
          assignedCases: db.cases.filter((c) => c.assignedStaffIds.includes(auth.id)).length,
          upcomingHearings: myHearings.filter((h) => h.hearingDate >= today).length,
          todayHearings: myHearings.filter((h) => h.hearingDate === today).length,
          pendingTasks: db.tasks.filter((t) => t.assignedStaffId === auth.id && t.status !== 'Completed').length,
        },
      })
    }

    if (method === 'POST' && path === '/api/contact') {
      const body = await readBody(req)
      db.contacts.push({ id: uid('msg'), ...body, createdAt: new Date().toISOString() })
      saveDb(db)
      return json(res, 201, { ok: true, message: 'Message received' })
    }

    // ─── Admin APIs ─────────────────────────────────────────────
    const adminAuth = getAuth(req)

    if (method === 'GET' && path === '/api/admin/stats') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const today = toDateKey(new Date())
      const activeLawyers = db.lawyers.filter((l) => l.publicProfileEnabled !== false).length
      const activeStaff = db.staff.filter((s) => s.active).length
      const openCases = db.cases.filter((c) => !['Closed', 'Disposed'].includes(c.status)).length
      const upcomingHearings = (db.hearings || []).filter((h) => h.hearingDate >= today).length
      return json(res, 200, {
        data: {
          lawyers: db.lawyers.length,
          staff: db.staff.length,
          cases: db.cases.length,
          hearings: (db.hearings || []).length,
          tasks: (db.tasks || []).length,
          documents: (db.documents || []).length,
          notifications: (db.notifications || []).length,
          contacts: (db.contacts || []).length,
          courtTypes: (db.courtTypes || []).length,
          courts: (db.courtEntries || []).length,
          divisions: (db.divisions || []).length,
          activeLawyers,
          activeStaff,
          openCases,
          upcomingHearings,
          verifiedLawyers: db.lawyers.filter((l) => l.verified).length,
          mongo: isMongoConnected(),
        },
      })
    }

    if (method === 'GET' && path === '/api/admin/lawyers') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const q = (url.searchParams.get('q') || '').trim().toLowerCase()
      let list = [...db.lawyers]
      if (q) {
        list = list.filter(
          (l) =>
            l.fullName?.toLowerCase().includes(q) ||
            l.email?.toLowerCase().includes(q) ||
            l.mobile?.includes(q) ||
            l.district?.toLowerCase().includes(q) ||
            l.enrollmentNumber?.toLowerCase().includes(q),
        )
      }
      return json(res, 200, {
        data: list.map((l) => ({
          id: l.id,
          fullName: l.fullName,
          email: l.email,
          mobile: l.mobile,
          district: l.district,
          division: l.division,
          court: l.court,
          practiceType: l.practiceType || 'both',
          practiceAreas: l.practiceAreas,
          barAssociation: l.barAssociation,
          enrollmentNumber: l.enrollmentNumber,
          yearsOfExperience: l.yearsOfExperience,
          verified: !!l.verified,
          publicProfileEnabled: l.publicProfileEnabled !== false,
          photo: l.photo,
          chamberName: l.chamberName,
          caseCount: db.cases.filter(
            (c) =>
              c.ownerLawyerId === l.id ||
              c.plaintiffLawyerId === l.id ||
              c.defendantLawyerId === l.id,
          ).length,
          staffCount: db.staff.filter((s) => s.lawyerId === l.id).length,
        })),
      })
    }

    const adminLawyerMatch = path.match(/^\/api\/admin\/lawyers\/([^/]+)$/)
    if (adminLawyerMatch && method === 'PATCH') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const lawyer = db.lawyers.find((l) => l.id === adminLawyerMatch[1])
      if (!lawyer) return json(res, 404, { error: 'উকিল পাওয়া যায়নি' }, req)
      const body = await readBody(req)
      if (typeof body.verified === 'boolean') lawyer.verified = body.verified
      if (typeof body.publicProfileEnabled === 'boolean') lawyer.publicProfileEnabled = body.publicProfileEnabled
      saveDb(db)
      return json(res, 200, { ok: true, data: { id: lawyer.id, verified: lawyer.verified, publicProfileEnabled: lawyer.publicProfileEnabled } })
    }
    if (adminLawyerMatch && method === 'DELETE') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const lawyer = db.lawyers.find((l) => l.id === adminLawyerMatch[1])
      if (!lawyer) return json(res, 404, { error: 'উকিল পাওয়া যায়নি' }, req)
      cascadeDeleteLawyer(db, lawyer.id)
      saveDb(db)
      return json(res, 200, { ok: true, message: 'উকিল ও সম্পর্কিত ডেটা ডিলিট হয়েছে' })
    }

    if (method === 'GET' && path === '/api/admin/staff') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const q = (url.searchParams.get('q') || '').trim().toLowerCase()
      let list = [...db.staff]
      if (q) {
        list = list.filter(
          (s) =>
            s.name?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.mobile?.includes(q) ||
            s.staffCode?.toLowerCase().includes(q),
        )
      }
      return json(res, 200, {
        data: list.map((s) => {
          const lawyer = db.lawyers.find((l) => l.id === s.lawyerId)
          return {
            id: s.id,
            staffCode: s.staffCode,
            name: s.name,
            email: s.email,
            mobile: s.mobile,
            role: s.role,
            active: s.active !== false,
            photo: s.photo,
            lawyerId: s.lawyerId || '',
            lawyerName: lawyer?.fullName || '',
            caseCount: db.cases.filter((c) => (c.assignedStaffIds || []).includes(s.id)).length,
            permissions: s.permissions,
          }
        }),
      })
    }

    const adminStaffMatch = path.match(/^\/api\/admin\/staff\/([^/]+)$/)
    if (adminStaffMatch && method === 'PATCH') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const staff = db.staff.find((s) => s.id === adminStaffMatch[1])
      if (!staff) return json(res, 404, { error: 'স্টাফ পাওয়া যায়নি' }, req)
      const body = await readBody(req)
      if (typeof body.active === 'boolean') staff.active = body.active
      saveDb(db)
      return json(res, 200, { ok: true, data: { id: staff.id, active: staff.active } })
    }
    if (adminStaffMatch && method === 'DELETE') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const staff = db.staff.find((s) => s.id === adminStaffMatch[1])
      if (!staff) return json(res, 404, { error: 'স্টাফ পাওয়া যায়নি' }, req)
      cascadeDeleteStaff(db, staff.id)
      saveDb(db)
      return json(res, 200, { ok: true, message: 'স্টাফ ডিলিট হয়েছে' })
    }

    if (method === 'GET' && path === '/api/admin/cases') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const q = (url.searchParams.get('q') || '').trim().toLowerCase()
      let list = [...db.cases]
      if (q) {
        list = list.filter(
          (c) =>
            c.caseNumber?.toLowerCase().includes(q) ||
            c.title?.toLowerCase().includes(q) ||
            c.plaintiff?.toLowerCase().includes(q) ||
            c.defendant?.toLowerCase().includes(q) ||
            c.courtName?.toLowerCase().includes(q) ||
            c.district?.toLowerCase().includes(q),
        )
      }
      return json(res, 200, {
        data: list.map((c) => ({
          id: c.id,
          caseNumber: c.caseNumber,
          title: c.title,
          caseType: c.caseType,
          status: c.status,
          division: c.division,
          district: c.district,
          courtType: c.courtType,
          courtName: c.courtName,
          plaintiff: c.plaintiff,
          defendant: c.defendant,
          plaintiffLawyerName: c.plaintiffLawyerName,
          defendantLawyerName: c.defendantLawyerName,
          ownerLawyerId: c.ownerLawyerId,
          nextHearingDate: c.nextHearingDate,
          filingDate: c.filingDate,
        })),
      })
    }

    const adminCaseMatch = path.match(/^\/api\/admin\/cases\/([^/]+)$/)
    if (adminCaseMatch && method === 'DELETE') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const c = db.cases.find((x) => x.id === adminCaseMatch[1])
      if (!c) return json(res, 404, { error: 'মামলা পাওয়া যায়নি' }, req)
      cascadeDeleteCase(db, c.id)
      saveDb(db)
      return json(res, 200, { ok: true, message: 'মামলা ও সম্পর্কিত ডেটা ডিলিট হয়েছে' })
    }

    if (method === 'GET' && path === '/api/admin/courts') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      return json(res, 200, {
        data: {
          divisions: db.divisions || [],
          courtTypes: db.courtTypes || [],
          courts: db.courtEntries || [],
        },
      })
    }

    if (method === 'POST' && path === '/api/admin/court-types') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const body = await readBody(req)
      const label = String(body.label || '').trim()
      const value = String(body.value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
      if (!label || !value) return json(res, 400, { error: 'লেবেল ও ভ্যালু আবশ্যক' }, req)
      if ((db.courtTypes || []).some((t) => t.value === value)) {
        return json(res, 409, { error: 'এই ধরন ইতিমধ্যে আছে' }, req)
      }
      const row = { id: uid('ct'), value, label }
      db.courtTypes = [...(db.courtTypes || []), row]
      saveDb(db)
      return json(res, 201, { ok: true, data: row })
    }

    const adminCourtTypeMatch = path.match(/^\/api\/admin\/court-types\/([^/]+)$/)
    if (adminCourtTypeMatch && method === 'DELETE') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const type = (db.courtTypes || []).find((t) => t.id === adminCourtTypeMatch[1])
      if (!type) return json(res, 404, { error: 'ধরন পাওয়া যায়নি' }, req)
      const used = (db.courtEntries || []).some((c) => c.courtType === type.value)
      if (used) return json(res, 400, { error: 'এই ধরনের আদালত আছে — আগে সেগুলো ডিলিট করুন' }, req)
      db.courtTypes = db.courtTypes.filter((t) => t.id !== type.id)
      saveDb(db)
      return json(res, 200, { ok: true, message: 'আদালতের ধরন ডিলিট হয়েছে' })
    }

    if (method === 'POST' && path === '/api/admin/courts') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const body = await readBody(req)
      const division = String(body.division || '').trim()
      const district = String(body.district || '').trim()
      const courtType = String(body.courtType || '').trim()
      const courtName = String(body.courtName || '').trim()
      if (!division || !district || !courtType || !courtName) {
        return json(res, 400, { error: 'বিভাগ, জেলা, ধরন ও আদালতের নাম আবশ্যক' }, req)
      }
      if (!(db.courtTypes || []).some((t) => t.value === courtType)) {
        return json(res, 400, { error: 'অবৈধ আদালতের ধরন' }, req)
      }
      const exists = (db.courtEntries || []).some(
        (c) =>
          c.division === division &&
          c.district === district &&
          c.courtType === courtType &&
          c.courtName === courtName,
      )
      if (exists) return json(res, 409, { error: 'এই আদালত ইতিমধ্যে আছে' }, req)
      const row = { id: uid('crt'), division, district, courtType, courtName }
      db.courtEntries = [...(db.courtEntries || []), row]
      // ensure district exists under division
      const div = (db.divisions || []).find((d) => d.name === division)
      if (div && !div.districts.includes(district)) {
        div.districts.push(district)
      } else if (!div) {
        db.divisions = [...(db.divisions || []), { id: uid('div'), name: division, districts: [district] }]
      }
      saveDb(db)
      return json(res, 201, { ok: true, data: row })
    }

    const adminCourtMatch = path.match(/^\/api\/admin\/courts\/([^/]+)$/)
    if (adminCourtMatch && method === 'DELETE') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const before = (db.courtEntries || []).length
      db.courtEntries = (db.courtEntries || []).filter((c) => c.id !== adminCourtMatch[1])
      if (db.courtEntries.length === before) return json(res, 404, { error: 'আদালত পাওয়া যায়নি' }, req)
      saveDb(db)
      return json(res, 200, { ok: true, message: 'আদালত ডিলিট হয়েছে' })
    }

    if (method === 'POST' && path === '/api/admin/divisions') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const body = await readBody(req)
      const name = String(body.name || '').trim()
      if (!name) return json(res, 400, { error: 'বিভাগের নাম আবশ্যক' }, req)
      if ((db.divisions || []).some((d) => d.name === name)) {
        return json(res, 409, { error: 'বিভাগ ইতিমধ্যে আছে' }, req)
      }
      const row = { id: uid('div'), name, districts: Array.isArray(body.districts) ? body.districts : [] }
      db.divisions = [...(db.divisions || []), row]
      saveDb(db)
      return json(res, 201, { ok: true, data: row })
    }

    if (method === 'POST' && path === '/api/admin/districts') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const body = await readBody(req)
      const division = String(body.division || '').trim()
      const district = String(body.district || '').trim()
      if (!division || !district) return json(res, 400, { error: 'বিভাগ ও জেলা আবশ্যক' }, req)
      const div = (db.divisions || []).find((d) => d.name === division)
      if (!div) return json(res, 404, { error: 'বিভাগ পাওয়া যায়নি' }, req)
      if (div.districts.includes(district)) return json(res, 409, { error: 'জেলা ইতিমধ্যে আছে' }, req)
      div.districts.push(district)
      saveDb(db)
      return json(res, 201, { ok: true, data: div })
    }

    if (method === 'GET' && path === '/api/admin/contacts') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      const list = [...(db.contacts || [])].sort(
        (a, b) => +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0),
      )
      return json(res, 200, { data: list })
    }

    const adminContactMatch = path.match(/^\/api\/admin\/contacts\/([^/]+)$/)
    if (adminContactMatch && method === 'DELETE') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      db.contacts = (db.contacts || []).filter((c) => c.id !== adminContactMatch[1])
      saveDb(db)
      return json(res, 200, { ok: true })
    }

    if (method === 'GET' && path === '/api/admin/db-overview') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      if (!isMongoConnected()) {
        return json(
          res,
          200,
          {
            data: {
              mongo: false,
              message: 'MongoDB offline — local JSON ব্যবহার হচ্ছে',
              collections: {
                lawyers: db.lawyers.length,
                staff: db.staff.length,
                cases: db.cases.length,
                hearings: (db.hearings || []).length,
                tasks: (db.tasks || []).length,
                documents: (db.documents || []).length,
                notifications: (db.notifications || []).length,
                contacts: (db.contacts || []).length,
                admins: (db.admins || []).length,
                divisions: (db.divisions || []).length,
                courtTypes: (db.courtTypes || []).length,
                courtEntries: (db.courtEntries || []).length,
              },
            },
          },
          req,
        )
      }
      const counts = await getCollectionCounts()
      return json(
        res,
        200,
        {
          data: {
            mongo: true,
            database: 'nyaypath',
            collections: [
              { name: COLLECTIONS.lawyers, label: 'উকিল রেজিস্ট্রেশন', count: counts.lawyers },
              { name: COLLECTIONS.staff, label: 'স্টাফ রেজিস্ট্রেশন', count: counts.staff },
              { name: COLLECTIONS.cases, label: 'মামলা', count: counts.cases },
              { name: COLLECTIONS.hearings, label: 'শুনানি', count: counts.hearings },
              { name: COLLECTIONS.tasks, label: 'টাস্ক', count: counts.tasks },
              { name: COLLECTIONS.documents, label: 'ডকুমেন্ট', count: counts.documents },
              { name: COLLECTIONS.notifications, label: 'নোটিফিকেশন', count: counts.notifications },
              { name: COLLECTIONS.contacts, label: 'কন্টাক্ট', count: counts.contacts },
              { name: COLLECTIONS.admins, label: 'অ্যাডমিন', count: counts.admins },
              { name: COLLECTIONS.divisions, label: 'বিভাগ/জেলা', count: counts.divisions },
              { name: COLLECTIONS.courtTypes, label: 'আদালতের ধরন', count: counts.courtTypes },
              { name: COLLECTIONS.courtEntries, label: 'আদালত', count: counts.courtEntries },
            ],
          },
        },
        req,
      )
    }

    if (method === 'POST' && path === '/api/admin/reseed') {
      if (!requireAdmin(adminAuth)) return json(res, 403, { error: 'Admin only' }, req)
      db = applyDemoHearingSchedule(seedDb())
      db.contacts = db.contacts || []
      ensureAdminCatalog(db)
      saveDb(db)
      return json(res, 200, {
        ok: true,
        message: 'Database reseeded',
        mongo: isMongoConnected(),
        counts: isMongoConnected() ? await getCollectionCounts() : null,
      })
    }

    return json(res, 404, { error: 'Not found', path }, req)
  } catch (err) {
    console.error(err)
    return json(res, 500, { error: 'Internal server error' }, req)
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    setCors(res, req)
    res.writeHead(204)
    res.end()
    return
  }
  if (!db) {
    json(res, 503, { error: 'Database not ready' }, req)
    return
  }
  handler(req, res)
})

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} already in use.`)
    console.error(`Backend already running → http://localhost:${PORT}`)
    console.error(`Open frontend → http://localhost:5173`)
    console.error(`(আগে থেকেই সার্ভার চলছে — আবার npm run dev লাগবে না)\n`)
    process.exit(0)
  }
  console.error(err)
  process.exit(1)
})

async function start() {
  await initDatabase()
  server.listen(PORT, () => {
    console.log(`NyayPath API running on http://localhost:${PORT}`)
    console.log(`Health: http://localhost:${PORT}/api/health`)
    console.log(`MongoDB: ${isMongoConnected() ? 'connected' : 'offline (JSON fallback)'}`)
    console.log('Demo lawyer: rafiqul@nyaypath.bd / lawyer123')
    console.log('Demo staff:  mahmud@nyaypath.bd / staff123')
    console.log('Demo admin:  admin@nyaypath.bd / admin123')
  })
}

process.on('SIGINT', async () => {
  await closeMongo()
  process.exit(0)
})

start().catch((err) => {
  console.error('Failed to start:', err)
  process.exit(1)
})
