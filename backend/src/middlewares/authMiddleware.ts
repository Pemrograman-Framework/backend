import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'

export const requireAuth = (request: Request, response: Response, next: NextFunction) => {
  const sessionCookie = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('ab_session='))
  const token = sessionCookie?.slice('ab_session='.length)
  const separator = token?.lastIndexOf('.') ?? -1
  if (!token || separator < 1) {
    response.status(401).json({ error: 'Authentication required.' })
    return
  }

  const payload = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  const expected = createHmac('sha256', env.sessionSecret).update(payload).digest()
  const received = Buffer.from(signature, 'base64url')
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    response.status(401).json({ error: 'Invalid session.' })
    return
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { expiresAt?: number }
    if (typeof session.expiresAt !== 'number' || session.expiresAt <= Date.now()) {
      response.status(401).json({ error: 'Session expired.' })
      return
    }
  } catch {
    response.status(401).json({ error: 'Invalid session.' })
    return
  }

  next()
}