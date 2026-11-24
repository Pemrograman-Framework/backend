import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { env } from './config/env.js'
import apiRoutes from './routes/index.js'

const app = express()
const allowedOrigins = new Set([env.clientOrigin])

if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:3000')
  allowedOrigins.add('http://localhost:3001')
}

app.use(cors({
  origin: (origin, callback) => {
    callback(null, origin === undefined || allowedOrigins.has(origin))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})
app.use('/api', apiRoutes)

const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  if (response.headersSent) {
    next(error)
    return
  }

  console.error('Unhandled API error:', error)
  response.status(500).json({ error: 'Terjadi kesalahan pada server.' })
}

app.use(errorHandler)

export default app
