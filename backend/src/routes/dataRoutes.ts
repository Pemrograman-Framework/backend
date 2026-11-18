import { Router } from 'express'
import { readData, writeCollection } from '../controllers/dataController.js'
import { requireAuth } from '../middlewares/authMiddleware.js'

const dataRoutes = Router()

dataRoutes.use(requireAuth)
dataRoutes.get('/', readData)
dataRoutes.put('/:collection', writeCollection)

export default dataRoutes