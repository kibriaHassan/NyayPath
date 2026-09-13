import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { mapDocType, requireAuth } from '../middleware/auth.js'

const router = Router()

function mapDoc(d: {
  id: string
  caseId: string
  name: string
  type: string
  fileType: string
  isPublic: boolean
  uploadDate: Date
  uploadedBy: { name: string } | null
}) {
  return {
    id: d.id,
    caseId: d.caseId,
    name: d.name,
    type: mapDocType(d.type),
    uploadDate: d.uploadDate.toISOString().slice(0, 10),
    uploadedBy: d.uploadedBy?.name || 'Unknown',
    fileType: d.fileType,
    isPublic: d.isPublic,
  }
}

router.get('/', requireAuth, async (req, res) => {
  const auth = req.auth!
  let caseFilter = {}

  if (auth.role === 'LAWYER') {
    caseFilter = { case: { ownerLawyerId: auth.lawyerProfileId } }
  } else if (auth.role === 'STAFF') {
    caseFilter = {
      case: { assignedStaff: { some: { staffId: auth.staffProfileId } } },
    }
  } else {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const docs = await prisma.caseDocument.findMany({
    where: caseFilter,
    include: { uploadedBy: true },
    orderBy: { uploadDate: 'desc' },
  })
  res.json({ data: docs.map(mapDoc) })
})

const docSchema = z.object({
  caseId: z.string(),
  name: z.string().min(1),
  type: z.enum(['Case File', 'Petition', 'Order', 'Judgment', 'Evidence', 'Other']).default('Other'),
  fileType: z.string().default('PDF'),
  fileUrl: z.string().optional(),
})

const typeMap: Record<string, 'CaseFile' | 'Petition' | 'Order' | 'Judgment' | 'Evidence' | 'Other'> = {
  'Case File': 'CaseFile',
  Petition: 'Petition',
  Order: 'Order',
  Judgment: 'Judgment',
  Evidence: 'Evidence',
  Other: 'Other',
}

router.post('/', requireAuth, async (req, res) => {
  const parsed = docSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' })

  const caseItem = await prisma.case.findUnique({
    where: { id: parsed.data.caseId },
    include: { assignedStaff: true },
  })
  if (!caseItem) return res.status(404).json({ error: 'Case not found' })

  const auth = req.auth!
  if (auth.role === 'LAWYER' && caseItem.ownerLawyerId !== auth.lawyerProfileId) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (auth.role === 'STAFF') {
    const staff = await prisma.staffProfile.findUnique({ where: { id: auth.staffProfileId } })
    const assigned = caseItem.assignedStaff.some((s) => s.staffId === auth.staffProfileId)
    if (!staff?.manageDocuments || !assigned) return res.status(403).json({ error: 'Forbidden' })
  }

  const created = await prisma.caseDocument.create({
    data: {
      caseId: parsed.data.caseId,
      name: parsed.data.name,
      type: typeMap[parsed.data.type] || 'Other',
      fileType: parsed.data.fileType,
      fileUrl: parsed.data.fileUrl,
      uploadedById: auth.userId,
      isPublic: false,
    },
    include: { uploadedBy: true },
  })

  res.status(201).json({ data: mapDoc(created) })
})

export default router
