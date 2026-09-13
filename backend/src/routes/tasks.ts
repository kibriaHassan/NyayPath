import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { mapTaskStatus, requireAuth, requireRole, toDbTaskStatus } from '../middleware/auth.js'

const router = Router()

function mapTask(t: {
  id: string
  title: string
  description: string
  caseId: string
  lawyerId: string
  assignedStaffId: string | null
  dueDate: Date
  priority: string
  status: string
  case: { caseNumber: string }
}) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    caseId: t.caseId,
    caseNumber: t.case.caseNumber,
    assignedStaffId: t.assignedStaffId || '',
    lawyerId: t.lawyerId,
    dueDate: t.dueDate.toISOString().slice(0, 10),
    priority: t.priority,
    status: mapTaskStatus(t.status),
  }
}

router.get('/', requireAuth, async (req, res) => {
  const auth = req.auth!
  let where = {}
  if (auth.role === 'LAWYER') where = { lawyerId: auth.lawyerProfileId }
  else if (auth.role === 'STAFF') where = { assignedStaffId: auth.staffProfileId }
  else return res.status(403).json({ error: 'Forbidden' })

  const tasks = await prisma.task.findMany({
    where,
    include: { case: true },
    orderBy: { dueDate: 'asc' },
  })
  res.json({ data: tasks.map(mapTask) })
})

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  caseId: z.string(),
  assignedStaffId: z.string().optional(),
  dueDate: z.string(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  status: z.string().optional(),
})

router.post('/', requireAuth, requireRole('LAWYER'), async (req, res) => {
  const parsed = taskSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed' })

  const created = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || '',
      caseId: parsed.data.caseId,
      lawyerId: req.auth!.lawyerProfileId!,
      assignedStaffId: parsed.data.assignedStaffId || null,
      dueDate: new Date(parsed.data.dueDate),
      priority: parsed.data.priority,
    },
    include: { case: true },
  })

  if (parsed.data.assignedStaffId) {
    const staff = await prisma.staffProfile.findUnique({
      where: { id: parsed.data.assignedStaffId },
    })
    if (staff) {
      await prisma.notification.create({
        data: {
          userId: staff.userId,
          title: 'নতুন টাস্ক অ্যাসাইন',
          message: parsed.data.title,
          type: 'task',
          link: '/staff/tasks',
        },
      })
    }
  }

  res.status(201).json({ data: mapTask(created) })
})

router.patch('/:id/status', requireAuth, async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: { case: true } })
  if (!task) return res.status(404).json({ error: 'Task not found' })

  const auth = req.auth!
  const allowed =
    (auth.role === 'LAWYER' && task.lawyerId === auth.lawyerProfileId) ||
    (auth.role === 'STAFF' && task.assignedStaffId === auth.staffProfileId)
  if (!allowed) return res.status(403).json({ error: 'Forbidden' })

  const status = toDbTaskStatus(String(req.body.status || 'Pending')) as 'Pending' | 'InProgress' | 'Completed'
  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status },
    include: { case: true },
  })
  res.json({ data: mapTask(updated) })
})

export default router
