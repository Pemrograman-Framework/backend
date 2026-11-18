import { createHmac } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { findActiveUserByEmail } from '../models/userModel.js'

export const login = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { email, password } = request.body ?? {}
    if (typeof email !== 'string' || typeof password !== 'string') {
      response.status(400).json({ error: 'Email and password are required.' })
      return
    }

    const user = await findActiveUserByEmail(email.trim())
    if (!user || password !== env.demoPassword) {
      response.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' })
      return
    }

    const expiresAt = Date.now() + 8 * 60 * 60 * 1000
    const payload = Buffer.from(JSON.stringify({ email: user.email, expiresAt })).toString('base64url')
    const signature = createHmac('sha256', env.sessionSecret).update(payload).digest('base64url')
    response.cookie('ab_session', `${payload}.${signature}`, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    })
    response.json({ user })
  } catch (error) {
    next(error)
  }
}

export const logout = (_request: Request, response: Response) => {
  response.clearCookie('ab_session', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })
  response.status(204).end()
}