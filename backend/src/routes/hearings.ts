import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function mapHearing(h: {
  id: string
  caseId: string
  hearingDate: Date
  hearingTime: string
  court: string
  hearingType: string
  notes: string
  lawyerId: string
  responsibleStaffId: string | null
  case: { caseNumber: string; caseTitle: string }
}) {
  return {
    id: h.id,
    caseId: h.caseId,
    caseNumber: h.case.caseNumber,
    caseTitle: h.case.caseTitle,
    hearingDate: h.hearingDate.toISOString().slice(0, 10),
    hearingTime: h.hearingTime,
    court: h.court,
    hearingType: h.hearingType,
    notes: h.notes,
    responsibleStaffId: h.responsibleStaffId || undefined,
    lawyerId: h.lawyerId,
  }
}

router.get('/', requireAuth, async (req, res) => {
  const auth = req.auth!
  let where = {}
  if (auth.role === 'LAWYER') where = { lawyerId: auth.lawyerProfileId }
  else if (auth.role === 'STAFF') where = { responsibleStaffId: auth.staffProfileId }
  else return res.status(403).json({ error: 'Forbidden' })

  const hearings = await prisma.hearing.findMany({
    where,
    include: { case: true },
    orderBy: { hearingDate: 'asc' },
  })
  res.json({ data: hearings.map(mapHearing) })
})

const hearingSchema = z.object({
  caseId: z.string(),
  hearingDate: z.string(),
  hearingTime: z.string(),
  court: z.string(),
  hearingType: z.string(),
  notes: z.string().optional(),
  responsibleStaffId: z.string().optional(),
})

router.post('/', requireAuth, async (req, res) => {
  const auth = req.auth!
  if (auth.role !== 'LAWYER' && auth.role !== 'STAFF') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const parsed = hearingSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' })

  const caseItem = await prisma.case.findUnique({ where: { id: parsed.data.caseId } })
  if (!caseItem) return res.status(404).json({ error: 'Case not found' })

  const lawyerId =
    auth.role === 'LAWYER' ? auth.lawyerProfileId! : caseItem.ownerLawyerId

  if (auth.role === 'LAWYER' && caseItem.ownerLawyerId !== auth.lawyerProfileId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const created = await prisma.hearing.create({
    data: {
      caseId: parsed.data.caseId,
      hearingDate: new Date(parsed.data.hearingDate),
      hearingTime: parsed.data.hearingTime,
      court: parsed.data.court,
      hearingType: parsed.data.hearingType,
      notes: parsed.data.notes || '',
      lawyerId,
      responsibleStaffId: parsed.data.responsibleStaffId || null,
    },
    include: { case: true },
  })

  await prisma.case.update({
    where: { id: caseItem.id },
    data: {
      nextHearingDate: new Date(parsed.data.hearingDate),
      status: 'HearingScheduled',
    },
  })

  res.status(201).json({ data: mapHearing(created) })
})

export default router
