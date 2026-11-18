import dotenv from 'dotenv'
import { resolve } from 'node:path'

dotenv.config({ path: resolve(process.cwd(), 'backend/.env') })

const port = Number(process.env.PORT || 4000)
const mysqlPort = Number(process.env.MYSQL_PORT || 3306)
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'anna-brew-development-session-secret')

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.')
}
if (!Number.isInteger(mysqlPort) || mysqlPort < 1 || mysqlPort > 65535) {
  throw new Error('MYSQL_PORT must be a valid TCP port.')
}
if (!sessionSecret) throw new Error('SESSION_SECRET is required in production.')

export const env = {
  port,
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: mysqlPort,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'anna_brew',
  },
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  demoPassword: process.env.DEMO_PASSWORD || 'Anna2026!',
  sessionSecret,
}