import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.get('/lawyer', requireAuth, requireRole('LAWYER'), async (req, res) => {
  const profile = await prisma.lawyerProfile.findUnique({
    where: { id: req.auth!.lawyerProfileId },
    include: { user: true },
  })
  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  res.json({
    data: {
      id: profile.id,
      fullName: profile.user.name,
      email: profile.user.email,
      mobile: profile.user.mobile,
      photo: profile.user.photo,
      barAssociation: profile.barAssociation,
      enrollmentNumber: profile.enrollmentNumber,
      practiceAreas: profile.practiceAreas.split(',').map((s) => s.trim()),
      court: profile.court,
      district: profile.district,
      chamberName: profile.chamberName,
      chamberAddress: profile.chamberAddress,
      bio: profile.bio,
      yearsOfExperience: profile.yearsOfExperience,
      designation: profile.designation,
      publicProfileEnabled: profile.publicProfileEnabled,
      verified: profile.verified,
      visibility: {
        enrollmentNumber: profile.showEnrollment,
        mobile: profile.showMobile,
        email: profile.showEmail,
        chamberAddress: profile.showChamberAddress,
        bio: profile.showBio,
      },
    },
  })
})

router.put('/lawyer', requireAuth, requireRole('LAWYER'), async (req, res) => {
  const body = req.body
  const profile = await prisma.lawyerProfile.findUnique({
    where: { id: req.auth!.lawyerProfileId },
  })
  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  await prisma.user.update({
    where: { id: req.auth!.userId },
    data: {
      ...(body.fullName && { name: body.fullName }),
      ...(body.mobile && { mobile: body.mobile }),
      ...(body.photo && { photo: body.photo }),
    },
  })

  const updated = await prisma.lawyerProfile.update({
    where: { id: profile.id },
    data: {
      ...(body.barAssociation && { barAssociation: body.barAssociation }),
      ...(body.enrollmentNumber && { enrollmentNumber: body.enrollmentNumber }),
      ...(body.practiceAreas && {
        practiceAreas: Array.isArray(body.practiceAreas)
          ? body.practiceAreas.join(', ')
          : body.practiceAreas,
      }),
      ...(body.court && { court: body.court }),
      ...(body.district && { district: body.district }),
      ...(body.chamberName !== undefined && { chamberName: body.chamberName }),
      ...(body.chamberAddress !== undefined && { chamberAddress: body.chamberAddress }),
      ...(body.bio !== undefined && { bio: body.bio }),
      ...(body.yearsOfExperience !== undefined && {
        yearsOfExperience: Number(body.yearsOfExperience),
      }),
      ...(body.designation && { designation: body.designation }),
      ...(body.publicProfileEnabled !== undefined && {
        publicProfileEnabled: Boolean(body.publicProfileEnabled),
      }),
      ...(body.visibility && {
        showEnrollment: Boolean(body.visibility.enrollmentNumber),
        showMobile: Boolean(body.visibility.mobile),
        showEmail: Boolean(body.visibility.email),
        showChamberAddress: Boolean(body.visibility.chamberAddress),
        showBio: Boolean(body.visibility.bio),
      }),
    },
    include: { user: true },
  })

  res.json({ data: { id: updated.id, fullName: updated.user.name } })
})

router.get('/dashboard/lawyer', requireAuth, requireRole('LAWYER'), async (req, res) => {
  const lawyerId = req.auth!.lawyerProfileId!
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const [totalCases, activeCases, upcomingHearings, todayHearings, totalStaff, pendingTasks] =
    await Promise.all([
      prisma.case.count({ where: { ownerLawyerId: lawyerId } }),
      prisma.case.count({
        where: {
          ownerLawyerId: lawyerId,
          status: { in: ['Active', 'HearingScheduled'] },
        },
      }),
      prisma.hearing.count({
        where: { lawyerId, hearingDate: { gte: start } },
      }),
      prisma.hearing.count({
        where: { lawyerId, hearingDate: { gte: start, lt: end } },
      }),
      prisma.staffProfile.count({
        where: { lawyerId, user: { active: true } },
      }),
      prisma.task.count({
        where: { lawyerId, status: { not: 'Completed' } },
      }),
    ])

  res.json({
    data: { totalCases, activeCases, upcomingHearings, todayHearings, totalStaff, pendingTasks },
  })
})

router.get('/dashboard/staff', requireAuth, requireRole('STAFF'), async (req, res) => {
  const staffId = req.auth!.staffProfileId!
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const [assignedCases, upcomingHearings, todayHearings, pendingTasks] = await Promise.all([
    prisma.caseStaff.count({ where: { staffId } }),
    prisma.hearing.count({
      where: { responsibleStaffId: staffId, hearingDate: { gte: start } },
    }),
    prisma.hearing.count({
      where: { responsibleStaffId: staffId, hearingDate: { gte: start, lt: end } },
    }),
    prisma.task.count({
      where: { assignedStaffId: staffId, status: { not: 'Completed' } },
    }),
  ])

  res.json({ data: { assignedCases, upcomingHearings, todayHearings, pendingTasks } })
})

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(2),
  message: z.string().min(5),
})

router.post('/contact', async (req, res) => {
  const parsed = contactSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' })
  await prisma.contactMessage.create({ data: parsed.data })
  res.status(201).json({ ok: true, message: 'Message received' })
})

export default router
