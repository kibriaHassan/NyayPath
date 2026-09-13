import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const items = await prisma.notification.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: 'desc' },
  })
  res.json({
    data: items.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
      link: n.link || undefined,
    })),
  })
})

router.patch('/:id/read', requireAuth, async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } })
  if (!n || n.userId !== req.auth!.userId) return res.status(404).json({ error: 'Not found' })
  const updated = await prisma.notification.update({
    where: { id: n.id },
    data: { read: true },
  })
  res.json({ data: updated })
})

router.post('/read-all', requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.auth!.userId, read: false },
    data: { read: true },
  })
  res.json({ ok: true })
})

export default router
