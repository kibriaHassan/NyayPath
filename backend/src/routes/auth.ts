import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth, signToken } from '../middleware/auth.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(6),
})

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(6),
  password: z.string().min(6),
  barAssociation: z.string().min(2),
  enrollmentNumber: z.string().min(2),
  practiceArea: z.string().min(2),
  court: z.string().min(2),
  district: z.string().optional(),
  chamberName: z.string().optional(),
  chamberAddress: z.string().optional(),
  bio: z.string().optional(),
  yearsOfExperience: z.coerce.number().min(0).default(0),
  photo: z.string().optional(),
})

function publicUser(user: {
  id: string
  name: string
  email: string
  role: string
  photo: string | null
  lawyerProfile?: { id: string } | null
  staffProfile?: { id: string; lawyerId: string } | null
}) {
  return {
    id: user.role === 'LAWYER' ? user.lawyerProfile?.id || user.id : user.staffProfile?.id || user.id,
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    photo: user.photo,
    lawyerId: user.staffProfile?.lawyerId,
    lawyerProfileId: user.lawyerProfile?.id,
    staffProfileId: user.staffProfile?.id,
  }
}

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid credentials payload' })

  const email = parsed.data.email.trim().toLowerCase()
  const user = await prisma.user.findUnique({
    where: { email },
    include: { lawyerProfile: true, staffProfile: true },
  })

  if (!user || !user.active) {
    return res.status(401).json({ error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' })
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' })

  const token = signToken({
    userId: user.id,
    role: user.role,
    lawyerProfileId: user.lawyerProfile?.id,
    staffProfileId: user.staffProfile?.id,
  })

  return res.json({ token, user: publicUser(user) })
})

router.post('/register/lawyer', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
  }

  const data = parsed.data
  const email = data.email.trim().toLowerCase()
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return res.status(409).json({ error: 'এই ইমেইল ইতিমধ্যে ব্যবহৃত হয়েছে।' })

  const passwordHash = await bcrypt.hash(data.password, 10)
  const photo =
    data.photo ||
    `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(data.fullName)}&backgroundColor=0c2e33`

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'LAWYER',
      name: data.fullName,
      mobile: data.mobile,
      photo,
      lawyerProfile: {
        create: {
          barAssociation: data.barAssociation,
          enrollmentNumber: data.enrollmentNumber,
          practiceAreas: data.practiceArea,
          court: data.court,
          district: data.district || data.court,
          chamberName: data.chamberName || '',
          chamberAddress: data.chamberAddress || '',
          bio: data.bio || '',
          yearsOfExperience: data.yearsOfExperience,
        },
      },
    },
    include: { lawyerProfile: true, staffProfile: true },
  })

  const token = signToken({
    userId: user.id,
    role: user.role,
    lawyerProfileId: user.lawyerProfile?.id,
  })

  return res.status(201).json({ token, user: publicUser(user) })
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    include: { lawyerProfile: true, staffProfile: true },
  })
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json({ user: publicUser(user) })
})

export default router
