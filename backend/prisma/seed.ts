import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.notification.deleteMany()
  await prisma.task.deleteMany()
  await prisma.caseDocument.deleteMany()
  await prisma.hearing.deleteMany()
  await prisma.caseStaff.deleteMany()
  await prisma.case.deleteMany()
  await prisma.staffProfile.deleteMany()
  await prisma.lawyerProfile.deleteMany()
  await prisma.contactMessage.deleteMany()
  await prisma.user.deleteMany()

  const lawyerPass = await bcrypt.hash('lawyer123', 10)
  const staffPass = await bcrypt.hash('staff123', 10)

  const lawyersData = [
    {
      email: 'rafiqul@nyaypath.bd',
      name: 'অ্যাডভোকেট রফিকুল ইসলাম',
      mobile: '01711-234567',
      barAssociation: 'ঢাকা বার অ্যাসোসিয়েশন',
      enrollmentNumber: 'D-4521/2012',
      practiceAreas: 'সিভিল, পারিবারিক, জমি জমা',
      court: 'ঢাকা জেলা জজ আদালত',
      district: 'ঢাকা',
      chamberName: 'ইসলাম ল চেম্বার',
      chamberAddress: 'রুম ৩০৫, সুপ্রিম কোর্ট বার বিল্ডিং, ঢাকা',
      bio: '১৪ বছরের অভিজ্ঞতাসম্পন্ন সিভিল ও পারিবারিক আইন বিশেষজ্ঞ।',
      years: 14,
      verified: true,
      bg: '0c2e33',
    },
    {
      email: 'sabrina@nyaypath.bd',
      name: 'অ্যাডভোকেট সাবরিনা আহমেদ',
      mobile: '01812-345678',
      barAssociation: 'বাংলাদেশ সুপ্রিম কোর্ট বার',
      enrollmentNumber: 'SC-2189/2015',
      practiceAreas: 'ফৌজদারি, সাংবিধানিক',
      court: 'হাইকোর্ট বিভাগ',
      district: 'ঢাকা',
      chamberName: 'আহমেদ অ্যাসোসিয়েটস',
      chamberAddress: 'প্লট ১২, গুলশান অ্যাভিনিউ, ঢাকা',
      bio: 'ফৌজদারি ও সাংবিধানিক মামলায় বিশেষজ্ঞ।',
      years: 11,
      verified: true,
      bg: '1a6b75',
      showMobile: false,
    },
    {
      email: 'kamrul@nyaypath.bd',
      name: 'অ্যাডভোকেট কামরুল হাসান',
      mobile: '01913-456789',
      barAssociation: 'চট্টগ্রাম বার অ্যাসোসিয়েশন',
      enrollmentNumber: 'C-3310/2010',
      practiceAreas: 'কর্পোরেট, ব্যাংকিং, চুক্তি',
      court: 'চট্টগ্রাম জেলা জজ আদালত',
      district: 'চট্টগ্রাম',
      chamberName: 'হাসান ল ফার্ম',
      chamberAddress: 'আগ্রাবাদ কমার্সিয়াল এরিয়া, চট্টগ্রাম',
      bio: 'কর্পোরেট ও বাণিজ্যিক আইনে ১৬ বছরের অভিজ্ঞতা।',
      years: 16,
      verified: true,
      bg: '9a6b3f',
      designation: 'সিনিয়র অ্যাডভোকেট',
      showEnrollment: false,
    },
    {
      email: 'nazmun@nyaypath.bd',
      name: 'অ্যাডভোকেট নাজমুন নাহার',
      mobile: '01614-567890',
      barAssociation: 'রাজশাহী বার অ্যাসোসিয়েশন',
      enrollmentNumber: 'R-1876/2018',
      practiceAreas: 'পারিবারিক, উত্তরাধিকার, সিভিল',
      court: 'রাজশাহী জেলা জজ আদালত',
      district: 'রাজশাহী',
      chamberName: 'নাহার চেম্বার',
      chamberAddress: 'শাহ মখদুম এভিনিউ, রাজশাহী',
      bio: 'পারিবারিক ও উত্তরাধিকার মামলায় বিশেষজ্ঞ।',
      years: 8,
      verified: true,
      bg: '164850',
      showEmail: false,
    },
    {
      email: 'tanvir@nyaypath.bd',
      name: 'অ্যাডভোকেট তানভীর আলম',
      mobile: '01515-678901',
      barAssociation: 'সিলেট বার অ্যাসোসিয়েশন',
      enrollmentNumber: 'S-9901/2014',
      practiceAreas: 'জমি জমা, রেকর্ড সংশোধন, সিভিল',
      court: 'সিলেট জেলা জজ আদালত',
      district: 'সিলেট',
      chamberName: 'আলম অ্যান্ড পার্টনার্স',
      chamberAddress: 'জিন্দাবাজার, সিলেট',
      bio: 'জমি ও রেকর্ড সংক্রান্ত মামলায় দীর্ঘ অভিজ্ঞতা।',
      years: 12,
      verified: false,
      bg: '0c2e33',
      showChamberAddress: false,
    },
  ]

  const lawyerProfiles = []
  for (const l of lawyersData) {
    const user = await prisma.user.create({
      data: {
        email: l.email,
        passwordHash: lawyerPass,
        role: 'LAWYER',
        name: l.name,
        mobile: l.mobile,
        photo: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(l.name)}&backgroundColor=${l.bg}`,
        lawyerProfile: {
          create: {
            barAssociation: l.barAssociation,
            enrollmentNumber: l.enrollmentNumber,
            practiceAreas: l.practiceAreas,
            court: l.court,
            district: l.district,
            chamberName: l.chamberName,
            chamberAddress: l.chamberAddress,
            bio: l.bio,
            yearsOfExperience: l.years,
            designation: l.designation || 'অ্যাডভোকেট',
            verified: l.verified,
            showMobile: l.showMobile ?? true,
            showEmail: l.showEmail ?? true,
            showEnrollment: l.showEnrollment ?? true,
            showChamberAddress: l.showChamberAddress ?? true,
          },
        },
      },
      include: { lawyerProfile: true },
    })
    lawyerProfiles.push(user.lawyerProfile!)
  }

  const [law1, law2, law3, law4, law5] = lawyerProfiles

  const staffDefs = [
    { email: 'mahmud@nyaypath.bd', name: 'মাহমুদ হাসান', mobile: '01720-111111', lawyerId: law1.id, role: 'Case Manager', edit: true, docs: true, tasks: true },
    { email: 'farhana@nyaypath.bd', name: 'ফারহানা ইয়াসমিন', mobile: '01720-222222', lawyerId: law1.id, role: 'Legal Assistant', editHearing: true },
    { email: 'rakib@nyaypath.bd', name: 'রাকিবুল ইসলাম', mobile: '01720-333333', lawyerId: law1.id, role: 'Office Assistant' },
    { email: 'nusrat@nyaypath.bd', name: 'নুসরাত জাহান', mobile: '01820-444444', lawyerId: law2.id, role: 'Case Manager', edit: true, add: true, docs: true },
    { email: 'imran@nyaypath.bd', name: 'ইমরান হোসেন', mobile: '01820-555555', lawyerId: law2.id, role: 'Legal Assistant', tasks: true },
    { email: 'saddam@nyaypath.bd', name: 'সাদ্দাম হোসেন', mobile: '01920-666666', lawyerId: law3.id, role: 'Case Manager', edit: true, editHearing: true, docs: true },
    { email: 'afroza@nyaypath.bd', name: 'আফরোজা বেগম', mobile: '01620-777777', lawyerId: law4.id, role: 'Legal Assistant' },
    { email: 'jahid@nyaypath.bd', name: 'জাহিদুল করিম', mobile: '01520-888888', lawyerId: law5.id, role: 'Office Assistant', active: false },
  ]

  const staffProfiles = []
  for (const s of staffDefs) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash: staffPass,
        role: 'STAFF',
        name: s.name,
        mobile: s.mobile,
        active: s.active ?? true,
        photo: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(s.name)}&backgroundColor=1a6b75`,
        staffProfile: {
          create: {
            lawyerId: s.lawyerId,
            roleTitle: s.role,
            editCases: s.edit ?? false,
            addCase: s.add ?? false,
            editHearingDates: s.editHearing ?? false,
            manageDocuments: s.docs ?? false,
            manageTasks: s.tasks ?? false,
          },
        },
      },
      include: { staffProfile: true },
    })
    staffProfiles.push(user.staffProfile!)
  }

  const [stf1, stf2, stf3, stf4, stf5, stf6, stf7] = staffProfiles

  const case1 = await prisma.case.create({
    data: {
      caseNumber: '123/2026',
      caseTitle: 'করিম উদ্দিন বনাম রহিম মিয়া',
      caseType: 'সিভিল স্যুট',
      courtName: 'ঢাকা জেলা জজ আদালত',
      courtLocation: 'ঢাকা',
      filingDate: new Date('2025-11-12'),
      status: 'HearingScheduled',
      plaintiff: 'করিম উদ্দিন',
      defendant: 'রহিম মিয়া',
      plaintiffLawyerId: law1.id,
      defendantLawyerId: law2.id,
      plaintiffLawyerName: law1 ? 'অ্যাডভোকেট রফিকুল ইসলাম' : undefined,
      defendantLawyerName: 'অ্যাডভোকেট সাবরিনা আহমেদ',
      nextHearingDate: new Date('2026-09-18'),
      judgeName: 'বিচারক আব্দুল্লাহ আল মামুন',
      description: 'জমি দখল সংক্রান্ত সিভিল মামলা।',
      importantNotes: 'পরবর্তী শুনানিতে কাগজপত্র জমা দিতে হবে।',
      privateNotes: 'ক্লায়েন্টের সাথে গোপন আলোচনা — সাক্ষী তালিকা চূড়ান্ত হয়নি।',
      ownerLawyerId: law1.id,
      assignedStaff: { create: [{ staffId: stf1.id }, { staffId: stf2.id }] },
    },
  })

  const case2 = await prisma.case.create({
    data: {
      caseNumber: '456/2025',
      caseTitle: 'রাষ্ট্র বনাম জাহিদ হাসান',
      caseType: 'ফৌজদারি',
      courtName: 'মেট্রোপলিটন সেশন জজ আদালত',
      courtLocation: 'ঢাকা',
      filingDate: new Date('2025-06-20'),
      status: 'Active',
      plaintiff: 'রাষ্ট্র',
      defendant: 'জাহিদ হাসান',
      defendantLawyerId: law2.id,
      defendantLawyerName: 'অ্যাডভোকেট সাবরিনা আহমেদ',
      nextHearingDate: new Date('2026-09-15'),
      judgeName: 'বিচারক নাসরিন সুলতানা',
      description: 'ফৌজদারি মামলা — জামিন শুনানির অপেক্ষায়।',
      importantNotes: 'জামিন আবেদন প্রস্তুত।',
      privateNotes: 'সাক্ষীর নিরাপত্তা বিষয়ে নোট।',
      ownerLawyerId: law2.id,
      assignedStaff: { create: [{ staffId: stf4.id }] },
    },
  })

  await prisma.case.createMany({
    data: [
      {
        caseNumber: '789/2026',
        caseTitle: 'মোঃ আলমগীর বনাম ব্যাংক এশিয়া',
        caseType: 'ব্যাংকিং / কর্পোরেট',
        courtName: 'চট্টগ্রাম জেলা জজ আদালত',
        courtLocation: 'চট্টগ্রাম',
        filingDate: new Date('2026-01-08'),
        status: 'Pending',
        plaintiff: 'মোঃ আলমগীর',
        defendant: 'ব্যাংক এশিয়া',
        plaintiffLawyerId: law3.id,
        plaintiffLawyerName: 'অ্যাডভোকেট কামরুল হাসান',
        nextHearingDate: new Date('2026-09-22'),
        judgeName: 'বিচারক ফারুক আহমেদ',
        description: 'ঋণ চুক্তি ও সুদ সংক্রান্ত বিরোধ।',
        ownerLawyerId: law3.id,
      },
      {
        caseNumber: '321/2024',
        caseTitle: 'সালমা বেগম বনাম করিম মিয়া',
        caseType: 'পারিবারিক',
        courtName: 'রাজশাহী পারিবারিক আদালত',
        courtLocation: 'রাজশাহী',
        filingDate: new Date('2024-09-15'),
        status: 'HearingScheduled',
        plaintiff: 'সালমা বেগম',
        defendant: 'করিম মিয়া',
        plaintiffLawyerId: law4.id,
        plaintiffLawyerName: 'অ্যাডভোকেট নাজমুন নাহার',
        nextHearingDate: new Date('2026-09-12'),
        judgeName: 'বিচারক শিরিন আখতার',
        description: 'ভরণপোষণ ও খোরপোশ সংক্রান্ত মামলা।',
        ownerLawyerId: law4.id,
      },
      {
        caseNumber: '555/2025',
        caseTitle: 'আব্দুর রহমান বনাম মোঃ সেলিম',
        caseType: 'জমি জমা',
        courtName: 'সিলেট জেলা জজ আদালত',
        courtLocation: 'সিলেট',
        filingDate: new Date('2025-03-02'),
        status: 'Active',
        plaintiff: 'আব্দুর রহমান',
        defendant: 'মোঃ সেলিম',
        plaintiffLawyerId: law5.id,
        defendantLawyerId: law1.id,
        plaintiffLawyerName: 'অ্যাডভোকেট তানভীর আলম',
        defendantLawyerName: 'অ্যাডভোকেট রফিকুল ইসলাম',
        nextHearingDate: new Date('2026-10-05'),
        judgeName: 'বিচারক হাসান মাহমুদ',
        description: 'রেকর্ড সংশোধন ও মালিকানা দাবি।',
        ownerLawyerId: law5.id,
      },
      {
        caseNumber: '112/2026',
        caseTitle: 'নূর জাহান বনাম সিটি কর্পোরেশন',
        caseType: 'সিভিল',
        courtName: 'ঢাকা জেলা জজ আদালত',
        courtLocation: 'ঢাকা',
        filingDate: new Date('2026-02-14'),
        status: 'HearingScheduled',
        plaintiff: 'নূর জাহান',
        defendant: 'ঢাকা দক্ষিণ সিটি কর্পোরেশন',
        plaintiffLawyerId: law1.id,
        plaintiffLawyerName: 'অ্যাডভোকেট রফিকুল ইসলাম',
        nextHearingDate: new Date('2026-09-25'),
        judgeName: 'বিচারক আব্দুল্লাহ আল মামুন',
        description: 'অবৈধ উচ্ছেদ রোধে নিষেধাজ্ঞা চেয়ে মামলা।',
        ownerLawyerId: law1.id,
      },
      {
        caseNumber: '998/2023',
        caseTitle: 'মেসার্স গ্রিন টেক বনাম মেসার্স ব্লু ওয়েভ',
        caseType: 'চুক্তি / কর্পোরেট',
        courtName: 'চট্টগ্রাম জেলা জজ আদালত',
        courtLocation: 'চট্টগ্রাম',
        filingDate: new Date('2023-12-01'),
        status: 'Disposed',
        plaintiff: 'মেসার্স গ্রিন টেক',
        defendant: 'মেসার্স ব্লু ওয়েভ',
        plaintiffLawyerId: law3.id,
        plaintiffLawyerName: 'অ্যাডভোকেট কামরুল হাসান',
        nextHearingDate: new Date('2026-01-10'),
        judgeName: 'বিচারক ফারুক আহমেদ',
        description: 'চুক্তি ভঙ্গ সংক্রান্ত মামলা — নিষ্পত্তি হয়েছে।',
        ownerLawyerId: law3.id,
      },
      {
        caseNumber: '220/2026',
        caseTitle: 'রিনা আক্তার বনাম শামীম রেজা',
        caseType: 'পারিবারিক',
        courtName: 'ঢাকা পারিবারিক আদালত',
        courtLocation: 'ঢাকা',
        filingDate: new Date('2026-04-18'),
        status: 'Pending',
        plaintiff: 'রিনা আক্তার',
        defendant: 'শামীম রেজা',
        plaintiffLawyerId: law2.id,
        plaintiffLawyerName: 'অ্যাডভোকেট সাবরিনা আহমেদ',
        nextHearingDate: new Date('2026-09-30'),
        judgeName: 'বিচারক তania চৌধুরী',
        description: 'তালাক ও দেনমোহর দাবি।',
        ownerLawyerId: law2.id,
      },
      {
        caseNumber: '667/2025',
        caseTitle: 'মোস্তাফিজুর রহমান বনাম ল্যান্ড অফিস',
        caseType: 'রেকর্ড সংশোধন',
        courtName: 'সিলেট জেলা জজ আদালত',
        courtLocation: 'সিলেট',
        filingDate: new Date('2025-08-22'),
        status: 'Active',
        plaintiff: 'মোস্তাফিজুর রহমান',
        defendant: 'সংশ্লিষ্ট ল্যান্ড অফিস',
        plaintiffLawyerId: law5.id,
        plaintiffLawyerName: 'অ্যাডভোকেট তানভীর আলম',
        nextHearingDate: new Date('2026-10-12'),
        judgeName: 'বিচারক হাসান মাহমুদ',
        description: 'নামজারি ও খতিয়ান সংশোধন।',
        ownerLawyerId: law5.id,
      },
      {
        caseNumber: '404/2026',
        caseTitle: 'হাসান আলী বনাম কবির আহমেদ',
        caseType: 'সিভিল স্যুট',
        courtName: 'রাজশাহী জেলা জজ আদালত',
        courtLocation: 'রাজশাহী',
        filingDate: new Date('2026-05-05'),
        status: 'Closed',
        plaintiff: 'হাসান আলী',
        defendant: 'কবির আহমেদ',
        plaintiffLawyerId: law4.id,
        plaintiffLawyerName: 'অ্যাডভোকেট নাজমুন নাহার',
        defendantLawyerName: 'অ্যাডভোকেট মোঃ ইউনুস (প্ল্যাটফর্ম বহির্ভূত)',
        nextHearingDate: new Date('2026-06-01'),
        judgeName: 'বিচারক শিরিন আখতার',
        description: 'ঋণ আদায় সংক্রান্ত মামলা — বন্ধ।',
        ownerLawyerId: law4.id,
      },
    ],
  })

  // Assign remaining staff links
  const case112 = await prisma.case.findFirst({ where: { caseNumber: '112/2026' } })
  const case321 = await prisma.case.findFirst({ where: { caseNumber: '321/2024' } })
  const case789 = await prisma.case.findFirst({ where: { caseNumber: '789/2026' } })
  const case220 = await prisma.case.findFirst({ where: { caseNumber: '220/2026' } })

  if (case112) {
    await prisma.caseStaff.createMany({
      data: [
        { caseId: case112.id, staffId: stf2.id },
        { caseId: case112.id, staffId: stf3.id },
      ],
    })
  }
  if (case321) await prisma.caseStaff.create({ data: { caseId: case321.id, staffId: stf7.id } })
  if (case789) await prisma.caseStaff.create({ data: { caseId: case789.id, staffId: stf6.id } })
  if (case220) await prisma.caseStaff.create({ data: { caseId: case220.id, staffId: stf5.id } })

  await prisma.hearing.createMany({
    data: [
      {
        caseId: case1.id,
        hearingDate: new Date('2026-09-18'),
        hearingTime: '10:30',
        court: 'ঢাকা জেলা জজ আদালত',
        hearingType: 'Argument',
        notes: 'কাগজপত্র জমা',
        responsibleStaffId: stf1.id,
        lawyerId: law1.id,
      },
      {
        caseId: case2.id,
        hearingDate: new Date('2026-09-15'),
        hearingTime: '11:00',
        court: 'মেট্রোপলিটন সেশন জজ আদালত',
        hearingType: 'Bail Hearing',
        notes: 'জামিন শুনানি',
        responsibleStaffId: stf4.id,
        lawyerId: law2.id,
      },
      {
        caseId: case112!.id,
        hearingDate: new Date('2026-09-25'),
        hearingTime: '10:00',
        court: 'ঢাকা জেলা জজ আদালত',
        hearingType: 'Injunction',
        notes: 'স্থগিতাদেশ শুনানি',
        responsibleStaffId: stf2.id,
        lawyerId: law1.id,
      },
      {
        caseId: case1.id,
        hearingDate: new Date('2026-10-08'),
        hearingTime: '10:15',
        court: 'ঢাকা জেলা জজ আদালত',
        hearingType: 'Further Hearing',
        notes: 'পরবর্তী তারিখ',
        responsibleStaffId: stf1.id,
        lawyerId: law1.id,
      },
    ],
  })

  const law1User = await prisma.user.findUnique({ where: { email: 'rafiqul@nyaypath.bd' } })
  const stf1User = await prisma.user.findUnique({ where: { email: 'mahmud@nyaypath.bd' } })

  await prisma.caseDocument.create({
    data: {
      caseId: case1.id,
      name: 'মূল পিটিশন',
      type: 'Petition',
      fileType: 'PDF',
      uploadedById: law1User!.id,
    },
  })

  await prisma.task.createMany({
    data: [
      {
        title: 'সাক্ষী তালিকা প্রস্তুত',
        description: 'মামলা 123/2026 এর জন্য সাক্ষীদের তালিকা চূড়ান্ত করুন।',
        caseId: case1.id,
        assignedStaffId: stf1.id,
        lawyerId: law1.id,
        dueDate: new Date('2026-09-16'),
        priority: 'High',
        status: 'InProgress',
      },
      {
        title: 'জামিন আবেদন ফাইল চেক',
        description: 'জামিন আবেদনের কাগজপত্র যাচাই।',
        caseId: case2.id,
        assignedStaffId: stf4.id,
        lawyerId: law2.id,
        dueDate: new Date('2026-09-14'),
        priority: 'Urgent',
        status: 'Pending',
      },
      {
        title: 'স্থগিতাদেশ খসড়া',
        description: '112/2026 মামলার স্থগিতাদেশ আবেদন খসড়া।',
        caseId: case112!.id,
        assignedStaffId: stf2.id,
        lawyerId: law1.id,
        dueDate: new Date('2026-09-20'),
        priority: 'High',
        status: 'Pending',
      },
    ],
  })

  await prisma.notification.createMany({
    data: [
      {
        userId: law1User!.id,
        title: 'আসন্ন শুনানি',
        message: 'মামলা 123/2026 — ১৮ সেপ্টেম্বর শুনানি নির্ধারিত।',
        type: 'hearing',
        link: '/lawyer/hearings',
      },
      {
        userId: law1User!.id,
        title: 'নতুন টাস্ক অগ্রগতি',
        message: 'মাহমুদ হাসান সাক্ষী তালিকা প্রস্তুত করছেন।',
        type: 'task',
        link: '/lawyer/tasks',
      },
      {
        userId: stf1User!.id,
        title: 'নতুন মামলা অ্যাসাইন',
        message: 'আপনাকে মামলা 123/2026 অ্যাসাইন করা হয়েছে।',
        type: 'case',
        link: '/staff/cases',
      },
    ],
  })

  console.log('Seed complete.')
  console.log('Lawyer: rafiqul@nyaypath.bd / lawyer123')
  console.log('Staff:  mahmud@nyaypath.bd / staff123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
