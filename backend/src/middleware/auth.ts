import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { Role } from '@prisma/client'
import { prisma } from './prisma.js'

export type AuthPayload = {
  userId: string
  role: Role
  lawyerProfileId?: string
  staffProfileId?: string
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

const secret = () => process.env.JWT_SECRET || 'nyaypath-dev-secret'

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, secret(), { expiresIn: '7d' })
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const token = header.slice(7)
    req.auth = jwt.verify(token, secret()) as AuthPayload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}

export async function getAuthContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { lawyerProfile: true, staffProfile: true },
  })
  return user
}

export function mapCaseStatus(status: string) {
  const map: Record<string, string> = {
    HearingScheduled: 'Hearing Scheduled',
    Active: 'Active',
    Pending: 'Pending',
    Disposed: 'Disposed',
    Closed: 'Closed',
  }
  return map[status] || status
}

export function toDbCaseStatus(status: string) {
  const map: Record<string, string> = {
    'Hearing Scheduled': 'HearingScheduled',
    Active: 'Active',
    Pending: 'Pending',
    Disposed: 'Disposed',
    Closed: 'Closed',
  }
  return map[status] || status
}

export function mapTaskStatus(status: string) {
  return status === 'InProgress' ? 'In Progress' : status
}

export function toDbTaskStatus(status: string) {
  return status === 'In Progress' ? 'InProgress' : status
}

export function mapDocType(type: string) {
  const map: Record<string, string> = {
    CaseFile: 'Case File',
    Petition: 'Petition',
    Order: 'Order',
    Judgment: 'Judgment',
    Evidence: 'Evidence',
    Other: 'Other',
  }
  return map[type] || type
}
