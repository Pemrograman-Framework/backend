import { Router } from 'express'
import authRoutes from './authRoutes.js'
import dataRoutes from './dataRoutes.js'

const routes = Router()

routes.get('/health', (_request, response) => response.json({ status: 'ok' }))
routes.use('/auth', authRoutes)
routes.use('/data', dataRoutes)

export default routes