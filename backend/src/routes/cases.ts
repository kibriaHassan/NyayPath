import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import {
  mapCaseStatus,
  requireAuth,
  requireRole,
  toDbCaseStatus,
} from '../middleware/auth.js'

const router = Router()

function serializeCase(
  c: Awaited<ReturnType<typeof prisma.case.findFirst>> & {
    assignedStaff?: { staffId: string }[]
  },
  { includePrivate = false } = {},
) {
  if (!c) return null
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    caseTitle: c.caseTitle,
    caseType: c.caseType,
    courtName: c.courtName,
    courtLocation: c.courtLocation,
    filingDate: c.filingDate.toISOString().slice(0, 10),
    status: mapCaseStatus(c.status),
    plaintiff: c.plaintiff,
    defendant: c.defendant,
    plaintiffLawyerId: c.plaintiffLawyerId || undefined,
    defendantLawyerId: c.defendantLawyerId || undefined,
    plaintiffLawyerName: c.plaintiffLawyerName || undefined,
    defendantLawyerName: c.defendantLawyerName || undefined,
    nextHearingDate: c.nextHearingDate?.toISOString().slice(0, 10) || '',
    judgeName: c.judgeName || '',
    description: c.description,
    assignedStaffIds: c.assignedStaff?.map((s) => s.staffId) || [],
    importantNotes: includePrivate ? c.importantNotes : c.importantNotes,
    privateNotes: includePrivate ? c.privateNotes : undefined,
    ownerLawyerId: c.ownerLawyerId,
  }
}

router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim()
  const court = String(req.query.court || '').trim()
  if (!q) return res.status(400).json({ error: 'Case number required' })

  const cases = await prisma.case.findMany({
    where: {
      caseNumber: { contains: q },
      ...(court
        ? {
            OR: [
              { courtLocation: { contains: court } },
              { courtName: { contains: court } },
            ],
          }
        : {}),
    },
    include: { assignedStaff: true },
  })

  // Public response — strip private notes
  res.json({
    data: cases.map((c) => ({
      ...serializeCase(c, { includePrivate: false }),
      privateNotes: undefined,
      importantNotes: undefined,
      assignedStaffIds: [],
    })),
  })
})

router.get('/', requireAuth, async (req, res) => {
  const auth = req.auth!
  let where = {}

  if (auth.role === 'LAWYER' && auth.lawyerProfileId) {
    where = { ownerLawyerId: auth.lawyerProfileId }
  } else if (auth.role === 'STAFF' && auth.staffProfileId) {
    where = { assignedStaff: { some: { staffId: auth.staffProfileId } } }
  } else {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const cases = await prisma.case.findMany({
    where,
    include: { assignedStaff: true },
    orderBy: { nextHearingDate: 'asc' },
  })

  res.json({ data: cases.map((c) => serializeCase(c, { includePrivate: true })) })
})

router.get('/:id', requireAuth, async (req, res) => {
  const auth = req.auth!
  const c = await prisma.case.findUnique({
    where: { id: req.params.id },
    include: { assignedStaff: true },
  })
  if (!c) return res.status(404).json({ error: 'Case not found' })

  const allowed =
    (auth.role === 'LAWYER' && c.ownerLawyerId === auth.lawyerProfileId) ||
    (auth.role === 'STAFF' &&
      c.assignedStaff.some((s) => s.staffId === auth.staffProfileId))

  if (!allowed) return res.status(403).json({ error: 'Forbidden' })

  res.json({ data: serializeCase(c, { includePrivate: true }) })
})

const caseSchema = z.object({
  caseNumber: z.string().min(1),
  caseTitle: z.string().min(1),
  caseType: z.string().min(1),
  courtName: z.string().min(1),
  courtLocation: z.string().min(1),
  filingDate: z.string(),
  status: z.string().default('Active'),
  plaintiff: z.string().min(1),
  defendant: z.string().min(1),
  plaintiffLawyerName: z.string().optional(),
  defendantLawyerName: z.string().optional(),
  plaintiffLawyerId: z.string().optional(),
  defendantLawyerId: z.string().optional(),
  nextHearingDate: z.string().optional(),
  judgeName: z.string().optional(),
  description: z.string().optional(),
  importantNotes: z.string().optional(),
  privateNotes: z.string().optional(),
  assignedStaffIds: z.array(z.string()).optional(),
})

router.post('/', requireAuth, requireRole('LAWYER'), async (req, res) => {
  const parsed = caseSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() })
  const data = parsed.data
  const lawyerId = req.auth!.lawyerProfileId!
  const status = toDbCaseStatus(data.status) as 'Active' | 'Pending' | 'HearingScheduled' | 'Disposed' | 'Closed'

  const created = await prisma.case.create({
    data: {
      caseNumber: data.caseNumber,
      caseTitle: data.caseTitle,
      caseType: data.caseType,
      courtName: data.courtName,
      courtLocation: data.courtLocation,
      filingDate: new Date(data.filingDate),
      status,
      plaintiff: data.plaintiff,
      defendant: data.defendant,
      plaintiffLawyerName: data.plaintiffLawyerName,
      defendantLawyerName: data.defendantLawyerName,
      plaintiffLawyerId: data.plaintiffLawyerId || null,
      defendantLawyerId: data.defendantLawyerId || null,
      nextHearingDate: data.nextHearingDate ? new Date(data.nextHearingDate) : null,
      judgeName: data.judgeName,
      description: data.description || '',
      importantNotes: data.importantNotes || '',
      privateNotes: data.privateNotes || '',
      ownerLawyerId: lawyerId,
      assignedStaff: data.assignedStaffIds?.length
        ? { create: data.assignedStaffIds.map((staffId) => ({ staffId })) }
        : undefined,
    },
    include: { assignedStaff: true },
  })

  res.status(201).json({ data: serializeCase(created, { includePrivate: true }) })
})

router.put('/:id', requireAuth, async (req, res) => {
  const auth = req.auth!
  const existing = await prisma.case.findUnique({
    where: { id: req.params.id },
    include: { assignedStaff: true },
  })
  if (!existing) return res.status(404).json({ error: 'Case not found' })

  if (auth.role === 'LAWYER' && existing.ownerLawyerId !== auth.lawyerProfileId) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (auth.role === 'STAFF') {
    const staff = await prisma.staffProfile.findUnique({ where: { id: auth.staffProfileId } })
    const assigned = existing.assignedStaff.some((s) => s.staffId === auth.staffProfileId)
    if (!staff?.editCases || !assigned) return res.status(403).json({ error: 'Forbidden' })
  }

  const parsed = caseSchema.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' })
  const data = parsed.data

  if (data.assignedStaffIds) {
    await prisma.caseStaff.deleteMany({ where: { caseId: existing.id } })
    await prisma.caseStaff.createMany({
      data: data.assignedStaffIds.map((staffId) => ({ caseId: existing.id, staffId })),
    })
  }

  const updated = await prisma.case.update({
    where: { id: existing.id },
    data: {
      ...(data.caseNumber && { caseNumber: data.caseNumber }),
      ...(data.caseTitle && { caseTitle: data.caseTitle }),
      ...(data.caseType && { caseType: data.caseType }),
      ...(data.courtName && { courtName: data.courtName }),
      ...(data.courtLocation && { courtLocation: data.courtLocation }),
      ...(data.filingDate && { filingDate: new Date(data.filingDate) }),
      ...(data.status && { status: toDbCaseStatus(data.status) as never }),
      ...(data.plaintiff && { plaintiff: data.plaintiff }),
      ...(data.defendant && { defendant: data.defendant }),
      ...(data.plaintiffLawyerName !== undefined && { plaintiffLawyerName: data.plaintiffLawyerName }),
      ...(data.defendantLawyerName !== undefined && { defendantLawyerName: data.defendantLawyerName }),
      ...(data.nextHearingDate && { nextHearingDate: new Date(data.nextHearingDate) }),
      ...(data.judgeName !== undefined && { judgeName: data.judgeName }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.importantNotes !== undefined && { importantNotes: data.importantNotes }),
      ...(data.privateNotes !== undefined && { privateNotes: data.privateNotes }),
    },
    include: { assignedStaff: true },
  })

  res.json({ data: serializeCase(updated, { includePrivate: true }) })
})

export default router
