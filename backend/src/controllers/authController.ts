import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { findActiveUserByEmail } from '../models/userModel.js'
import { createSessionToken, sessionCookieName, sessionCookieOptions } from '../middlewares/session.js'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const login = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const body: unknown = request.body
    if (
      !isRecord(body) ||
      typeof body.email !== 'string' ||
      typeof body.password !== 'string'
    ) {
      response.status(400).json({ error: 'Email dan kata sandi wajib diisi.' })
      return
    }

    const user = await findActiveUserByEmail(body.email.trim())
    if (!user || body.password !== env.demoPassword) {
      response.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' })
      return
    }

    response.cookie(sessionCookieName, createSessionToken(user), sessionCookieOptions)
    response.json({ user })
  } catch (error) {
    next(error)
  }
}

export const logout = (_request: Request, response: Response) => {
  response.clearCookie(sessionCookieName, sessionCookieOptions)
  response.status(204).end()
}
