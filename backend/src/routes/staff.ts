import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function mapStaff(s: {
  id: string
  roleTitle: string
  viewCases: boolean
  editCases: boolean
  addCase: boolean
  viewHearingDates: boolean
  editHearingDates: boolean
  manageDocuments: boolean
  addNotes: boolean
  manageTasks: boolean
  lawyerId: string
  user: { name: string; email: string; mobile: string | null; photo: string | null; active: boolean }
}) {
  return {
    id: s.id,
    lawyerId: s.lawyerId,
    name: s.user.name,
    email: s.user.email,
    mobile: s.user.mobile || '',
    role: s.roleTitle,
    active: s.user.active,
    photo: s.user.photo || '',
    permissions: {
      viewCases: s.viewCases,
      editCases: s.editCases,
      addCase: s.addCase,
      viewHearingDates: s.viewHearingDates,
      editHearingDates: s.editHearingDates,
      manageDocuments: s.manageDocuments,
      addNotes: s.addNotes,
      manageTasks: s.manageTasks,
    },
  }
}

router.get('/', requireAuth, requireRole('LAWYER'), async (req, res) => {
  const staff = await prisma.staffProfile.findMany({
    where: { lawyerId: req.auth!.lawyerProfileId },
    include: { user: true },
    orderBy: { user: { name: 'asc' } },
  })
  res.json({ data: staff.map(mapStaff) })
})

router.get('/:id', requireAuth, async (req, res) => {
  const staff = await prisma.staffProfile.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  })
  if (!staff) return res.status(404).json({ error: 'Staff not found' })

  if (
    req.auth!.role === 'LAWYER' &&
    staff.lawyerId !== req.auth!.lawyerProfileId
  ) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (req.auth!.role === 'STAFF' && staff.id !== req.auth!.staffProfileId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  res.json({ data: mapStaff(staff) })
})

const staffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(6),
  password: z.string().min(6).default('staff123'),
  role: z.string().default('Legal Assistant'),
  permissions: z
    .object({
      viewCases: z.boolean().optional(),
      editCases: z.boolean().optional(),
      addCase: z.boolean().optional(),
      viewHearingDates: z.boolean().optional(),
      editHearingDates: z.boolean().optional(),
      manageDocuments: z.boolean().optional(),
      addNotes: z.boolean().optional(),
      manageTasks: z.boolean().optional(),
    })
    .optional(),
})

router.post('/', requireAuth, requireRole('LAWYER'), async (req, res) => {
  const parsed = staffSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })

  const data = parsed.data
  const email = data.email.trim().toLowerCase()
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return res.status(409).json({ error: 'Email already used' })

  const passwordHash = await bcrypt.hash(data.password, 10)
  const p = data.permissions || {}

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'STAFF',
      name: data.name,
      mobile: data.mobile,
      photo: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(data.name)}&backgroundColor=1a6b75`,
      staffProfile: {
        create: {
          lawyerId: req.auth!.lawyerProfileId!,
          roleTitle: data.role,
          viewCases: p.viewCases ?? true,
          editCases: p.editCases ?? false,
          addCase: p.addCase ?? false,
          viewHearingDates: p.viewHearingDates ?? true,
          editHearingDates: p.editHearingDates ?? false,
          manageDocuments: p.manageDocuments ?? false,
          addNotes: p.addNotes ?? true,
          manageTasks: p.manageTasks ?? false,
        },
      },
    },
    include: { staffProfile: { include: { user: true } } },
  })

  await prisma.notification.create({
    data: {
      userId: req.auth!.userId,
      title: 'স্টাফ যোগ হয়েছে',
      message: `${data.name}-কে ${data.role} হিসেবে যোগ করা হয়েছে।`,
      type: 'staff',
      link: '/lawyer/staff',
    },
  })

  res.status(201).json({ data: mapStaff(user.staffProfile!) })
})

router.patch('/:id/access', requireAuth, requireRole('LAWYER'), async (req, res) => {
  const staff = await prisma.staffProfile.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  })
  if (!staff || staff.lawyerId !== req.auth!.lawyerProfileId) {
    return res.status(404).json({ error: 'Staff not found' })
  }

  const active = Boolean(req.body.active)
  await prisma.user.update({ where: { id: staff.userId }, data: { active } })
  const updated = await prisma.staffProfile.findUnique({
    where: { id: staff.id },
    include: { user: true },
  })
  res.json({ data: mapStaff(updated!) })
})

router.put('/:id/permissions', requireAuth, requireRole('LAWYER'), async (req, res) => {
  const staff = await prisma.staffProfile.findUnique({ where: { id: req.params.id } })
  if (!staff || staff.lawyerId !== req.auth!.lawyerProfileId) {
    return res.status(404).json({ error: 'Staff not found' })
  }

  const p = req.body.permissions || req.body
  const updated = await prisma.staffProfile.update({
    where: { id: staff.id },
    data: {
      viewCases: p.viewCases ?? staff.viewCases,
      editCases: p.editCases ?? staff.editCases,
      addCase: p.addCase ?? staff.addCase,
      viewHearingDates: p.viewHearingDates ?? staff.viewHearingDates,
      editHearingDates: p.editHearingDates ?? staff.editHearingDates,
      manageDocuments: p.manageDocuments ?? staff.manageDocuments,
      addNotes: p.addNotes ?? staff.addNotes,
      manageTasks: p.manageTasks ?? staff.manageTasks,
      ...(req.body.role ? { roleTitle: req.body.role } : {}),
    },
    include: { user: true },
  })
  res.json({ data: mapStaff(updated) })
})

export default router
