import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

function mapLawyer(l: {
  id: string
  barAssociation: string
  enrollmentNumber: string
  practiceAreas: string
  court: string
  district: string
  chamberName: string
  chamberAddress: string
  bio: string
  yearsOfExperience: number
  designation: string
  publicProfileEnabled: boolean
  showEnrollment: boolean
  showMobile: boolean
  showEmail: boolean
  showChamberAddress: boolean
  showBio: boolean
  verified: boolean
  user: { name: string; email: string; mobile: string | null; photo: string | null }
}, full = false) {
  const base = {
    id: l.id,
    fullName: l.user.name,
    email: l.showEmail || full ? l.user.email : undefined,
    mobile: l.showMobile || full ? l.user.mobile : undefined,
    barAssociation: l.barAssociation,
    enrollmentNumber: l.showEnrollment || full ? l.enrollmentNumber : undefined,
    practiceAreas: l.practiceAreas.split(',').map((s) => s.trim()).filter(Boolean),
    court: l.court,
    district: l.district,
    chamberName: l.chamberName,
    chamberAddress: l.showChamberAddress || full ? l.chamberAddress : undefined,
    bio: l.showBio || full ? l.bio : undefined,
    photo: l.user.photo,
    yearsOfExperience: l.yearsOfExperience,
    designation: l.designation,
    publicProfileEnabled: l.publicProfileEnabled,
    verified: l.verified,
    visibility: {
      enrollmentNumber: l.showEnrollment,
      mobile: l.showMobile,
      email: l.showEmail,
      chamberAddress: l.showChamberAddress,
      bio: l.showBio,
    },
  }
  return base
}

router.get('/', async (req, res) => {
  const { name, district, court, practiceArea, experience, bar } = req.query
  const lawyers = await prisma.lawyerProfile.findMany({
    where: {
      publicProfileEnabled: true,
      ...(district ? { district: String(district) } : {}),
      ...(court ? { court: { contains: String(court) } } : {}),
      ...(bar ? { barAssociation: String(bar) } : {}),
      ...(name
        ? { user: { name: { contains: String(name) } } }
        : {}),
      ...(practiceArea ? { practiceAreas: { contains: String(practiceArea) } } : {}),
      ...(experience ? { yearsOfExperience: { gte: Number(experience) } } : {}),
    },
    include: { user: true },
    orderBy: { yearsOfExperience: 'desc' },
  })
  res.json({ data: lawyers.map((l) => mapLawyer(l)) })
})

router.get('/:id', async (req, res) => {
  const lawyer = await prisma.lawyerProfile.findUnique({
    where: { id: req.params.id },
    include: { user: true },
  })
  if (!lawyer || !lawyer.publicProfileEnabled) {
    return res.status(404).json({ error: 'প্রোফাইল পাওয়া যায়নি' })
  }
  res.json({ data: mapLawyer(lawyer) })
})

export default router
