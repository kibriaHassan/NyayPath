/**
 * NyayPath Backend — zero external dependencies (Node.js built-ins only)
 * Run: node server.mjs
 */
import http from 'node:http'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
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
      court: 'ঢাকা জেলা জজ আদালত',
      district: 'ঢাকা',
      chamberName: 'ইসলাম ল চেম্বার',
      chamberAddress: 'রুম ৩০৫, সুপ্রিম কোর্ট বার বিল্ডিং, ঢাকা',
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
      court: 'হাইকোর্ট বিভাগ',
      district: 'ঢাকা',
      chamberName: 'আহমেদ অ্যাসোসিয়েটস',
      chamberAddress: 'প্লট ১২, গুলশান অ্যাভিনিউ, ঢাকা',
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

  return { lawyers, staff, cases, hearings, documents, tasks, notifications, contacts: [] }
}

function loadDb() {
  if (!existsSync(DB_FILE)) {
    const db = seedDb()
    saveDb(db)
    return db
  }
  return JSON.parse(readFileSync(DB_FILE, 'utf8'))
}

function saveDb(db) {
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
}

let db = loadDb()

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
    court: l.court,
    district: l.district,
    chamberName: l.chamberName,
    chamberAddress: l.visibility.chamberAddress ? l.chamberAddress : undefined,
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
  const s = db.staff.find((x) => x.id === auth.id)
  return s
    ? {
        id: s.id,
        name: s.name,
        email: s.email,
        role: 'STAFF',
        photo: s.photo,
        lawyerId: s.lawyerId,
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
      return json(res, 200, { ok: true, service: 'NyayPath API', time: new Date().toISOString() }, req)
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
      if (staff && staff.active && verifyPassword(body.password, staff.passwordHash)) {
        const token = signToken({ id: staff.id, role: 'STAFF', userId: staff.userId, lawyerId: staff.lawyerId })
        return json(res, 200, {
          token,
          user: {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            role: 'STAFF',
            photo: staff.photo,
            lawyerId: staff.lawyerId,
          },
        })
      }
      return json(res, 401, { error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' }, req)
    }

    if (method === 'POST' && path === '/api/auth/register/staff') {
      const body = await readBody(req)
      if (!body.email || !body.name || !body.password || !body.lawyerId) {
        return json(res, 400, { error: 'নাম, ইমেইল, পাসওয়ার্ড ও Lawyer নির্বাচন আবশ্যক।' }, req)
      }
      const email = String(body.email).trim().toLowerCase()
      if (db.lawyers.some((l) => l.email.toLowerCase() === email) || db.staff.some((s) => s.email.toLowerCase() === email)) {
        return json(res, 409, { error: 'এই ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে।' }, req)
      }
      const lawyer = db.lawyers.find((l) => l.id === body.lawyerId)
      if (!lawyer) return json(res, 404, { error: 'নির্বাচিত Lawyer পাওয়া যায়নি।' }, req)

      const id = uid('stf')
      const staff = {
        id,
        userId: uid('user'),
        lawyerId: lawyer.id,
        name: String(body.name).trim(),
        email,
        mobile: String(body.mobile || ''),
        passwordHash: hashPassword(body.password),
        role: body.role || 'Legal Assistant',
        active: true,
        photo:
          body.photo ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(body.name)}&backgroundColor=1a6b75`,
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
      }
      db.staff.push(staff)
      db.notifications.unshift({
        id: uid('ntf'),
        userId: lawyer.id,
        role: 'LAWYER',
        title: 'নতুন Staff রেজিস্ট্রেশন',
        message: `${staff.name} আপনার অধীনে Staff অ্যাকাউন্ট খুলেছেন (${staff.role})।`,
        type: 'staff',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/lawyer/staff',
      })
      db.notifications.unshift({
        id: uid('ntf'),
        userId: staff.id,
        role: 'STAFF',
        title: 'স্বাগতম!',
        message: `${lawyer.fullName}-এর অধীনে আপনার Staff অ্যাকাউন্ট তৈরি হয়েছে।`,
        type: 'system',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/staff/dashboard',
      })
      saveDb(db)
      const token = signToken({ id: staff.id, role: 'STAFF', userId: staff.userId, lawyerId: staff.lawyerId })
      return json(
        res,
        201,
        {
          token,
          user: {
            id: staff.id,
            name: staff.name,
            email: staff.email,
            role: 'STAFF',
            photo: staff.photo,
            lawyerId: staff.lawyerId,
          },
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
      const lawyer = {
        id,
        userId: uid('user'),
        fullName: body.fullName,
        email: body.email,
        mobile: body.mobile || '',
        passwordHash: hashPassword(body.password),
        barAssociation: body.barAssociation || '',
        enrollmentNumber: body.enrollmentNumber || '',
        practiceAreas: body.practiceArea ? [body.practiceArea] : ['সিভিল'],
        court: body.court || '',
        district: body.district || body.court || '',
        chamberName: body.chamberName || '',
        chamberAddress: body.chamberAddress || '',
        bio: body.bio || '',
        photo:
          body.photo ||
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(body.fullName)}&backgroundColor=0c2e33`,
        yearsOfExperience: Number(body.yearsOfExperience) || 0,
        designation: 'অ্যাডভোকেট',
        publicProfileEnabled: true,
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
      const experience = url.searchParams.get('experience')
      const bar = url.searchParams.get('bar')
      if (name) list = list.filter((l) => l.fullName.toLowerCase().includes(name.toLowerCase()))
      if (district) list = list.filter((l) => l.district === district)
      if (court) list = list.filter((l) => l.court.includes(court))
      if (practiceArea) list = list.filter((l) => l.practiceAreas.includes(practiceArea))
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

    // Public case search
    if (method === 'GET' && path === '/api/cases/search') {
      const q = (url.searchParams.get('q') || '').trim().toLowerCase()
      const court = (url.searchParams.get('court') || '').trim().toLowerCase()
      if (!q) return json(res, 400, { error: 'Case number required' })
      const results = db.cases
        .filter((c) => c.caseNumber.toLowerCase().includes(q))
        .filter((c) =>
          court
            ? c.courtLocation.toLowerCase().includes(court) || c.courtName.toLowerCase().includes(court)
            : true,
        )
        .map((c) => ({
          ...c,
          privateNotes: undefined,
          importantNotes: undefined,
          assignedStaffIds: [],
        }))
      return json(res, 200, { data: results })
    }

    // Protected routes below
    const auth = getAuth(req)

    if (method === 'GET' && path === '/api/cases') {
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      let list = []
      if (auth.role === 'LAWYER') list = db.cases.filter((c) => c.ownerLawyerId === auth.id)
      else if (auth.role === 'STAFF') list = db.cases.filter((c) => c.assignedStaffIds.includes(auth.id))
      else return json(res, 403, { error: 'Forbidden' })
      return json(res, 200, { data: list })
    }

    const caseMatch = path.match(/^\/api\/cases\/([^/]+)$/)
    if (method === 'GET' && caseMatch) {
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      const c = db.cases.find((x) => x.id === caseMatch[1])
      if (!c) return json(res, 404, { error: 'Case not found' })
      const allowed =
        (auth.role === 'LAWYER' && c.ownerLawyerId === auth.id) ||
        (auth.role === 'STAFF' && c.assignedStaffIds.includes(auth.id))
      if (!allowed) return json(res, 403, { error: 'Forbidden' })
      return json(res, 200, { data: c })
    }

    if (method === 'POST' && path === '/api/cases') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' })
      const body = await readBody(req)
      const created = {
        id: uid('case'),
        caseNumber: body.caseNumber,
        caseTitle: body.caseTitle,
        caseType: body.caseType,
        courtName: body.courtName,
        courtLocation: body.courtLocation,
        filingDate: body.filingDate,
        status: body.status || 'Active',
        plaintiff: body.plaintiff,
        defendant: body.defendant,
        plaintiffLawyerName: body.plaintiffLawyerName,
        defendantLawyerName: body.defendantLawyerName,
        nextHearingDate: body.nextHearingDate || '',
        judgeName: body.judgeName || '',
        description: body.description || '',
        assignedStaffIds: body.assignedStaffIds || [],
        importantNotes: body.importantNotes || '',
        privateNotes: body.privateNotes || '',
        ownerLawyerId: auth.id,
        plaintiffLawyerId: auth.id,
      }
      db.cases.push(created)
      saveDb(db)
      return json(res, 201, { data: created })
    }

    if (method === 'PUT' && caseMatch) {
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      const idx = db.cases.findIndex((x) => x.id === caseMatch[1])
      if (idx < 0) return json(res, 404, { error: 'Case not found' })
      const existing = db.cases[idx]
      if (auth.role === 'LAWYER' && existing.ownerLawyerId !== auth.id) {
        return json(res, 403, { error: 'Forbidden' })
      }
      if (auth.role === 'STAFF') {
        const staff = db.staff.find((s) => s.id === auth.id)
        if (!staff?.permissions.editCases || !existing.assignedStaffIds.includes(auth.id)) {
          return json(res, 403, { error: 'Forbidden' })
        }
      }
      const body = await readBody(req)
      db.cases[idx] = { ...existing, ...body, id: existing.id, ownerLawyerId: existing.ownerLawyerId }
      saveDb(db)
      return json(res, 200, { data: db.cases[idx] })
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

    if (method === 'POST' && path === '/api/staff') {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' })
      const body = await readBody(req)
      const created = {
        id: uid('stf'),
        userId: uid('user'),
        lawyerId: auth.id,
        name: body.name,
        email: body.email,
        mobile: body.mobile,
        passwordHash: hashPassword(body.password || 'staff123'),
        role: body.role || 'Legal Assistant',
        active: true,
        photo: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(body.name)}&backgroundColor=1a6b75`,
        permissions: body.permissions || {
          viewCases: true,
          editCases: false,
          addCase: false,
          viewHearingDates: true,
          editHearingDates: false,
          manageDocuments: false,
          addNotes: true,
          manageTasks: false,
        },
      }
      db.staff.push(created)
      db.notifications.unshift({
        id: uid('ntf'),
        userId: auth.id,
        role: 'LAWYER',
        title: 'স্টাফ যোগ হয়েছে',
        message: `${created.name}-কে যোগ করা হয়েছে।`,
        type: 'staff',
        read: false,
        createdAt: new Date().toISOString(),
        link: '/lawyer/staff',
      })
      saveDb(db)
      const { passwordHash, ...safe } = created
      return json(res, 201, { data: safe })
    }

    const staffMatch = path.match(/^\/api\/staff\/([^/]+)$/)
    if (method === 'GET' && staffMatch) {
      if (!auth) return json(res, 401, { error: 'Unauthorized' })
      const s = db.staff.find((x) => x.id === staffMatch[1])
      if (!s) return json(res, 404, { error: 'Staff not found' })
      if (auth.role === 'LAWYER' && s.lawyerId !== auth.id) return json(res, 403, { error: 'Forbidden' })
      if (auth.role === 'STAFF' && s.id !== auth.id) return json(res, 403, { error: 'Forbidden' })
      const { passwordHash, ...safe } = s
      return json(res, 200, { data: safe })
    }

    const staffAccess = path.match(/^\/api\/staff\/([^/]+)\/access$/)
    if (method === 'PATCH' && staffAccess) {
      if (!auth || auth.role !== 'LAWYER') return json(res, 403, { error: 'Forbidden' })
      const s = db.staff.find((x) => x.id === staffAccess[1] && x.lawyerId === auth.id)
      if (!s) return json(res, 404, { error: 'Staff not found' })
      const body = await readBody(req)
      s.active = Boolean(body.active)
      saveDb(db)
      const { passwordHash, ...safe } = s
      return json(res, 200, { data: safe })
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

    // Reset seed helper
    if (method === 'POST' && path === '/api/admin/reseed') {
      db = seedDb()
      saveDb(db)
      return json(res, 200, { ok: true, message: 'Database reseeded' })
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

server.listen(PORT, () => {
  console.log(`NyayPath API running on http://localhost:${PORT}`)
  console.log(`Health: http://localhost:${PORT}/api/health`)
  console.log('Demo lawyer: rafiqul@nyaypath.bd / lawyer123')
  console.log('Demo staff:  mahmud@nyaypath.bd / staff123')
})
