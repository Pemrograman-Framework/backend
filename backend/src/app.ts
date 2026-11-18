import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { errorHandler } from './middlewares/errorHandler.js'
import routes from './routes/index.js'

const app = express()

app.use(cors({ origin: env.clientOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use('/api', routes)
app.use((_request, response) => response.status(404).json({ error: 'Route not found.' }))
app.use(errorHandler)

export default app