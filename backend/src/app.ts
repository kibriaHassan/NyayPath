import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import authRoutes from './routes/auth.js'
import lawyerRoutes from './routes/lawyers.js'
import caseRoutes from './routes/cases.js'
import staffRoutes from './routes/staff.js'
import hearingRoutes from './routes/hearings.js'
import taskRoutes from './routes/tasks.js'
import documentRoutes from './routes/documents.js'
import notificationRoutes from './routes/notifications.js'
import miscRoutes from './routes/misc.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(',') || true,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '2mb' }))
  app.use(morgan('dev'))

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'NyayPath API',
      time: new Date().toISOString(),
    })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/lawyers', lawyerRoutes)
  app.use('/api/cases', caseRoutes)
  app.use('/api/staff', staffRoutes)
  app.use('/api/hearings', hearingRoutes)
  app.use('/api/tasks', taskRoutes)
  app.use('/api/documents', documentRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api', miscRoutes)

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  })

  return app
}
