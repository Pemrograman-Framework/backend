import { Router } from 'express'
import { login, logout } from '../controllers/authController.js'
import { readData, writeCollection } from '../controllers/dataController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const router = Router()

router.post('/auth/login', login)
router.post('/auth/logout', logout)
router.get('/data', requireAuth, readData)
router.put('/data/:collection', requireAuth, writeCollection)

export default router
