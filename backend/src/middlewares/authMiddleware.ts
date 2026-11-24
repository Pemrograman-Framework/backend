import type { RequestHandler } from 'express'
import { readSessionToken, sessionCookieName } from './session.js'

export const requireAuth: RequestHandler = (request, response, next) => {
  const cookie = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`))
  const token = cookie?.slice(sessionCookieName.length + 1)

  if (!token || !readSessionToken(token)) {
    response.status(401).json({ error: 'Sesi tidak valid atau telah berakhir.' })
    return
  }

  next()
}
