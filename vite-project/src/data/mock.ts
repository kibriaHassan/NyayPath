import type {
  Case,
  CaseDocument,
  Hearing,
  Lawyer,
  Notification,
  Staff,
  StaffPermissions,
  Task,
} from '@/types'
import { findDivisionByDistrict } from '@/lib/bdLocations'
import { filterCasesBySearch, toPublicCase } from '@/lib/caseSearch'
import { addDays, nextWorkingDayKey, toDateKey, todayKey } from '@/lib/courtCalendar'
import {
  inferPracticeType,
  matchesPracticeFilter,
  type PracticeType,
} from '@/lib/practiceTypes'

const defaultPermissions = (overrides: Partial<StaffPermissions> = {}): StaffPermissions => ({
  viewCases: true,
  editCases: false,
  addCase: false,
  viewHearingDates: true,
  editHearingDates: false,
  manageDocuments: false,
  addNotes: true,
  manageTasks: false,
  ...overrides,
})

export const lawyers: Lawyer[] = [
  {
    id: 'law-1',
    fullName: 'অ্যাডভোকেট রফিকুল ইসলাম',
    email: 'rafiqul@nyaypath.bd',
    mobile: '01711-234567',
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
    bio: '১৪ বছরের অভিজ্ঞতাসম্পন্ন সিভিল ও পারিবারিক আইন বিশেষজ্ঞ। জমি সংক্রান্ত মামলায় দক্ষ।',
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=RI&backgroundColor=0c2e33',
    yearsOfExperience: 14,
    designation: 'অ্যাডভোকেট',
    publicProfileEnabled: true,
    visibility: {
      enrollmentNumber: true,
      mobile: true,
      email: true,
      chamberAddress: true,
      bio: true,
    },
    verified: true,
  },
  {
    id: 'law-2',
    fullName: 'অ্যাডভোকেট সাবরিনা আহমেদ',
    email: 'sabrina@nyaypath.bd',
    mobile: '01812-345678',
    barAssociation: 'বাংলাদেশ সুপ্রিম কোর্ট বার',
    enrollmentNumber: 'SC-2189/2015',
    practiceAreas: ['ফৌজদারি', 'সাংবিধানিক'],
    practiceType: 'criminal',
    court: 'হাইকোর্ট বিভাগ',
    district: 'ঢাকা',
    chamberName: 'আহমেদ অ্যাসোসিয়েটস',
    chamberAddress: 'প্লট ১২, গুলশান অ্যাভিনিউ, ঢাকা',
    chamberLocation: 'গুলশান',
    bio: 'ফৌজদারি ও সাংবিধানিক মামলায় বিশেষজ্ঞ। নারী ও শিশু অধিকার বিষয়ে সক্রিয়।',
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=SA&backgroundColor=1a6b75',
    yearsOfExperience: 11,
    designation: 'অ্যাডভোকেট',
    publicProfileEnabled: true,
    visibility: {
      enrollmentNumber: true,
      mobile: false,
      email: true,
      chamberAddress: true,
      bio: true,
    },
    verified: true,
  },
  {
    id: 'law-3',
    fullName: 'অ্যাডভোকেট কামরুল হাসান',
    email: 'kamrul@nyaypath.bd',
    mobile: '01913-456789',
    barAssociation: 'চট্টগ্রাম বার অ্যাসোসিয়েশন',
    enrollmentNumber: 'C-3310/2010',
    practiceAreas: ['কর্পোরেট', 'ব্যাংকিং', 'চুক্তি', 'সিভিল'],
    practiceType: 'civil',
    court: 'চট্টগ্রাম জেলা জজ আদালত',
    district: 'চট্টগ্রাম',
    chamberName: 'হাসান ল ফার্ম',
    chamberAddress: 'আগ্রাবাদ কমার্সিয়াল এরিয়া, চট্টগ্রাম',
    chamberLocation: 'আগ্রাবাদ',
    bio: 'কর্পোরেট ও বাণিজ্যিক আইনে ১৬ বছরের অভিজ্ঞতা।',
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=KH&backgroundColor=9a6b3f',
    yearsOfExperience: 16,
    designation: 'সিনিয়র অ্যাডভোকেট',
    publicProfileEnabled: true,
    visibility: {
      enrollmentNumber: false,
      mobile: true,
      email: true,
      chamberAddress: true,
      bio: true,
    },
    verified: true,
  },
  {
    id: 'law-4',
    fullName: 'অ্যাডভোকেট নাজমুন নাহার',
    email: 'nazmun@nyaypath.bd',
    mobile: '01614-567890',
    barAssociation: 'রাজশাহী বার অ্যাসোসিয়েশন',
    enrollmentNumber: 'R-1876/2018',
    practiceAreas: ['পারিবারিক', 'উত্তরাধিকার', 'সিভিল'],
    practiceType: 'civil',
    court: 'রাজশাহী জেলা জজ আদালত',
    district: 'রাজশাহী',
    chamberName: 'নাহার চেম্বার',
    chamberAddress: 'শাহ মখদুম এভিনিউ, রাজশাহী',
    chamberLocation: 'শাহ মখদুম এভিনিউ',
    bio: 'পারিবারিক ও উত্তরাধিকার মামলায় বিশেষজ্ঞ।',
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=NN&backgroundColor=164850',
    yearsOfExperience: 8,
    designation: 'অ্যাডভোকেট',
    publicProfileEnabled: true,
    visibility: {
      enrollmentNumber: true,
      mobile: true,
      email: false,
      chamberAddress: true,
      bio: true,
    },
    verified: true,
  },
  {
    id: 'law-5',
    fullName: 'অ্যাডভোকেট তানভীর আলম',
    email: 'tanvir@nyaypath.bd',
    mobile: '01515-678901',
    barAssociation: 'সিলেট বার অ্যাসোসিয়েশন',
    enrollmentNumber: 'S-9901/2014',
    practiceAreas: ['জমি জমা', 'রেকর্ড সংশোধন', 'সিভিল', 'ফৌজদারি'],
    practiceType: 'both',
    court: 'সিলেট জেলা জজ আদালত',
    district: 'সিলেট',
    chamberName: 'আলম অ্যান্ড পার্টনার্স',
    chamberAddress: 'জিন্দাবাজার, সিলেট',
    chamberLocation: 'জিন্দাবাজার',
    bio: 'জমি ও রেকর্ড সংক্রান্ত মামলায় দীর্ঘ অভিজ্ঞতা।',
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=TA&backgroundColor=0c2e33',
    yearsOfExperience: 12,
    designation: 'অ্যাডভোকেট',
    publicProfileEnabled: true,
    visibility: {
      enrollmentNumber: true,
      mobile: true,
      email: true,
      chamberAddress: false,
      bio: true,
    },
    verified: false,
  },
]

export const staffMembers: Staff[] = [
  {
    id: 'stf-1',
    staffCode: 'NP-STF001',
    lawyerId: 'law-1',
    name: 'মাহমুদ হাসান',
    email: 'mahmud@nyaypath.bd',
    mobile: '01720-111111',
    role: 'Case Manager',
    permissions: defaultPermissions({
      editCases: true,
      editHearingDates: true,
      manageDocuments: true,
      manageTasks: true,
    }),
    active: true,
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=MH&backgroundColor=1a6b75',
  },
  {
    id: 'stf-2',
    staffCode: 'NP-STF002',
    lawyerId: 'law-1',
    name: 'ফারহানা ইয়াসমিন',
    email: 'farhana@nyaypath.bd',
    mobile: '01720-222222',
    role: 'Legal Assistant',
    permissions: defaultPermissions({ editHearingDates: true, addNotes: true }),
    active: true,
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=FY&backgroundColor=9a6b3f',
  },
  {
    id: 'stf-3',
    staffCode: 'NP-STF003',
    lawyerId: 'law-1',
    name: 'রাকিবুল ইসলাম',
    email: 'rakib@nyaypath.bd',
    mobile: '01720-333333',
    role: 'Office Assistant',
    permissions: defaultPermissions({ editCases: false, manageDocuments: false }),
    active: true,
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=RI2&backgroundColor=164850',
  },
  {
    id: 'stf-4',
    staffCode: 'NP-STF004',
    lawyerId: 'law-2',
    name: 'নুসরাত জাহান',
    email: 'nusrat@nyaypath.bd',
    mobile: '01820-444444',
    role: 'Case Manager',
    permissions: defaultPermissions({ editCases: true, addCase: true, manageDocuments: true }),
    active: true,
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=NJ&backgroundColor=0c2e33',
  },
  {
    id: 'stf-5',
    staffCode: 'NP-STF005',
    lawyerId: 'law-2',
    name: 'ইমরান হোসেন',
    email: 'imran@nyaypath.bd',
    mobile: '01820-555555',
    role: 'Legal Assistant',
    permissions: defaultPermissions({ manageTasks: true }),
    active: true,
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=IH&backgroundColor=1a6b75',
  },
  {
    id: 'stf-6',
    staffCode: 'NP-STF006',
    lawyerId: 'law-3',
    name: 'সাদ্দাম হোসেন',
    email: 'saddam@nyaypath.bd',
    mobile: '01920-666666',
    role: 'Case Manager',
    permissions: defaultPermissions({ editCases: true, editHearingDates: true, manageDocuments: true }),
    active: true,
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=SH&backgroundColor=9a6b3f',
  },
  {
    id: 'stf-7',
    staffCode: 'NP-STF007',
    lawyerId: 'law-4',
    name: 'আফরোজা বেগম',
    email: 'afroza@nyaypath.bd',
    mobile: '01620-777777',
    role: 'Legal Assistant',
    permissions: defaultPermissions({ addNotes: true, viewHearingDates: true }),
    active: true,
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=AB&backgroundColor=164850',
  },
  {
    id: 'stf-8',
    staffCode: 'NP-STF008',
    lawyerId: 'law-5',
    name: 'জাহিদুল করিম',
    email: 'jahid@nyaypath.bd',
    mobile: '01520-888888',
    role: 'Office Assistant',
    permissions: defaultPermissions(),
    active: false,
    photo: 'https://api.dicebear.com/9.x/initials/svg?seed=JK&backgroundColor=0c2e33',
  },
]

export const cases: Case[] = [
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
    description: 'জমি দখল সংক্রান্ত সিভিল মামলা। বাদী পক্ষ দাবি করেন বিবাদী অবৈধভাবে জমি দখল করেছেন।',
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
    defendantLawyerName: 'অ্যাডভোকেট মোঃ ইউনুস (প্ল্যাটফর্ম বহির্ভূত)',
    plaintiffLawyerName: 'অ্যাডভোকেট নাজমুন নাহার',
    nextHearingDate: '2026-06-01',
    judgeName: 'বিচারক শিরিন আখতার',
    description: 'ঋণ আদায় সংক্রান্ত মামলা — বন্ধ।',
    assignedStaffIds: ['stf-7'],
    importantNotes: 'ফাইল আর্কাইভ করা হয়েছে।',
    privateNotes: 'ক্লায়েন্ট সন্তুষ্ট।',
    ownerLawyerId: 'law-4',
  },
]

export const hearings: Hearing[] = [
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

export const documents: CaseDocument[] = [
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
  {
    id: 'doc-4',
    caseId: 'case-3',
    name: 'চুক্তির কপি',
    type: 'Evidence',
    uploadDate: '2026-01-10',
    uploadedBy: 'সাদ্দাম হোসেন',
    fileType: 'PDF',
    isPublic: false,
  },
  {
    id: 'doc-5',
    caseId: 'case-5',
    name: 'খতিয়ান কপি',
    type: 'Evidence',
    uploadDate: '2025-03-15',
    uploadedBy: 'অ্যাডভোকেট তানভীর আলম',
    fileType: 'PDF',
    isPublic: false,
  },
  {
    id: 'doc-6',
    caseId: 'case-6',
    name: 'কেস ফাইল সারাংশ',
    type: 'Case File',
    uploadDate: '2026-02-14',
    uploadedBy: 'ফারহানা ইয়াসমিন',
    fileType: 'PDF',
    isPublic: false,
  },
]

export const tasks: Task[] = [
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
    title: 'ব্যাংক নথি সংগ্রহ',
    description: 'ব্যাংক এশিয়া থেকে ঋণ চুক্তির অনুলিপি সংগ্রহ।',
    caseId: 'case-3',
    caseNumber: '789/2026',
    assignedStaffId: 'stf-6',
    lawyerId: 'law-3',
    dueDate: '2026-09-20',
    priority: 'Medium',
    status: 'Pending',
  },
  {
    id: 'task-4',
    title: 'ক্লায়েন্ট মিটিং নির্ধারণ',
    description: 'সালমা বেগমের সাথে শুনানির আগে মিটিং।',
    caseId: 'case-4',
    caseNumber: '321/2024',
    assignedStaffId: 'stf-7',
    lawyerId: 'law-4',
    dueDate: '2026-09-12',
    priority: 'High',
    status: 'Completed',
  },
  {
    id: 'task-5',
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
  {
    id: 'task-6',
    title: 'কেস ফাইল আপডেট',
    description: 'নতুন শুনানির তথ্য ফাইলে যোগ করুন।',
    caseId: 'case-1',
    caseNumber: '123/2026',
    assignedStaffId: 'stf-3',
    lawyerId: 'law-1',
    dueDate: '2026-09-17',
    priority: 'Low',
    status: 'Pending',
  },
]

export const notifications: Notification[] = [
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
    userId: 'law-1',
    role: 'LAWYER',
    title: 'নতুন টাস্ক অগ্রগতি',
    message: 'মাহমুদ হাসান সাক্ষী তালিকা প্রস্তুত করছেন।',
    type: 'task',
    read: false,
    createdAt: '2026-09-11T10:30:00',
    link: '/lawyer/tasks',
  },
  {
    id: 'ntf-3',
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
    id: 'ntf-4',
    userId: 'stf-1',
    role: 'STAFF',
    title: 'টাস্ক ডেডলাইন',
    message: 'সাক্ষী তালিকা প্রস্তুত — ১৬ সেপ্টেম্বরের মধ্যে।',
    type: 'task',
    read: true,
    createdAt: '2026-09-09T09:00:00',
    link: '/staff/tasks',
  },
  {
    id: 'ntf-5',
    userId: 'law-2',
    role: 'LAWYER',
    title: 'আজকের শুনানি স্মরণ',
    message: 'মামলা 456/2025 — জামিন শুনানি ১৫ সেপ্টেম্বর।',
    type: 'hearing',
    read: false,
    createdAt: '2026-09-11T07:00:00',
    link: '/lawyer/hearings',
  },
  {
    id: 'ntf-6',
    userId: 'law-1',
    role: 'LAWYER',
    title: 'স্টাফ যোগ হয়েছে',
    message: 'রাকিবুল ইসলামকে অফিস অ্যাসিস্ট্যান্ট হিসেবে যোগ করা হয়েছে।',
    type: 'staff',
    read: true,
    createdAt: '2026-09-01T12:00:00',
    link: '/lawyer/staff',
  },
]

/** Demo credentials for mock auth */
export const DEMO_ACCOUNTS = {
  lawyer: { email: 'rafiqul@nyaypath.bd', password: 'lawyer123', id: 'law-1' },
  staff: { email: 'mahmud@nyaypath.bd', password: 'staff123', id: 'stf-1' },
  admin: { email: 'admin@nyaypath.bd', password: 'admin123', id: 'admin-1' },
}

export function getLawyerById(id?: string) {
  if (!id) return undefined
  return lawyers.find((l) => l.id === id)
}

export function getStaffById(id?: string) {
  if (!id) return undefined
  return staffMembers.find((s) => s.id === id)
}

export function findStaffByQuery(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  const digits = q.replace(/\D/g, '')
  return staffMembers.find((s) => {
    if (s.staffCode.toLowerCase() === q) return true
    if (s.email.toLowerCase() === q) return true
    if (digits.length >= 8 && s.mobile.replace(/\D/g, '').endsWith(digits)) return true
    if (s.mobile.replace(/[\s-]/g, '') === q.replace(/[\s-]/g, '')) return true
    return false
  })
}

export function getCaseById(id?: string) {
  if (!id) return undefined
  return cases.find((c) => c.id === id)
}

export function searchCases(
  caseNumber: string,
  opts?: { court?: string; division?: string; district?: string; courtType?: string } | string,
) {
  // backward compat: searchCases(q, courtString)
  const filters =
    typeof opts === 'string'
      ? { q: caseNumber, division: '', district: '', court: opts, courtType: '' }
      : {
          q: caseNumber,
          division: opts?.division || '',
          district: opts?.district || '',
          courtType: opts?.courtType || '',
          court: opts?.court || '',
        }
  // district required for public search — if only court string passed, use it as soft court filter
  if (!filters.district && typeof opts === 'string') {
    return cases
      .filter((c) => {
        const q = caseNumber.trim().toLowerCase()
        if (!c.caseNumber.toLowerCase().includes(q)) return false
        const court = opts.toLowerCase()
        return (
          c.courtLocation.toLowerCase().includes(court) || c.courtName.toLowerCase().includes(court)
        )
      })
      .map(toPublicCase)
  }
  return filterCasesBySearch(cases, filters).map(toPublicCase)
}

/** Ensure every mock case has division/district for location search */
for (const c of cases) {
  if (!c.district) c.district = c.courtLocation
  if (!c.division) c.division = findDivisionByDistrict(c.district || '') || undefined
}

export function getPublicLawyers() {
  return lawyers.filter((l) => l.publicProfileEnabled)
}

export function filterLawyersByPracticeType(list: Lawyer[], filter: PracticeType | '') {
  return list.filter((l) =>
    matchesPracticeFilter(l.practiceType || inferPracticeType(l.practiceAreas), filter),
  )
}

/** Align demo hearing dates with "today" so dashboard sections always have data */
;(function applyDemoHearingSchedule() {
  const today = todayKey()
  const next = nextWorkingDayKey()
  const overdueA = toDateKey(addDays(new Date(), -5))
  const overdueB = toDateKey(addDays(new Date(), -12))

  const byId = (id: string) => cases.find((c) => c.id === id)

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

  // Overdue — date passed, purpose not entered (stays in "update needed" section)
  const c5 = byId('case-5')
  if (c5) {
    c5.nextHearingDate = overdueA
    c5.nextHearingPurpose = undefined
    c5.lastHearingDate = overdueA
    c5.status = 'Hearing Scheduled'
    c5.importantNotes = 'শেষ তারিখ চলে গেছে — পরবর্তী তারিখ এন্ট্রি বাকি।'
  }

  // Extra overdue owned by law-1 for lawyer dashboard demo
  if (!cases.some((c) => c.id === 'case-11')) {
    cases.push({
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
      description: 'ইউটিলিটি সংযোগ বিরোধ — শেষ শুনানির পরবর্তী তারিখ এন্ট্রি হয়নি।',
      assignedStaffIds: ['stf-1'],
      importantNotes: 'Staff তারিখ আপডেট করেনি।',
      privateNotes: 'ক্লায়েন্ট ফোন করেছে।',
      ownerLawyerId: 'law-1',
    })
  }

  // Next-day case also for staff stf-1 visibility
  const cAssignedNext = byId('case-1')
  // already today for stf-1

  // Sync a couple of hearing rows for calendar views
  const hToday = hearings.find((h) => h.id === 'hr-1')
  if (hToday) {
    hToday.hearingDate = today
    hToday.hearingType = 'Argument'
  }
  const hNext = hearings.find((h) => h.id === 'hr-4')
  if (hNext) {
    hNext.hearingDate = next
    hNext.hearingType = 'Injunction'
  }
})()

