import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.js'
import type { AppUser } from '../models/userModel.js'

const sessionDurationMs = 8 * 60 * 60 * 1000
export const sessionCookieName = 'anna_brew_session'
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: sessionDurationMs,
}

type SessionPayload = { user: AppUser; expiresAt: number }

const isAppUser = (value: unknown): value is AppUser =>
  typeof value === 'object' && value !== null &&
  typeof (value as Record<string, unknown>).nama === 'string' &&
  typeof (value as Record<string, unknown>).role === 'string' &&
  typeof (value as Record<string, unknown>).email === 'string'

const signatureFor = (payload: string) =>
  createHmac('sha256', env.sessionSecret)
    .update(payload)
    .digest('base64url')

export const createSessionToken = (user: AppUser) => {
  const payload = Buffer.from(JSON.stringify({
    user,
    expiresAt: Date.now() + sessionDurationMs,
  } satisfies SessionPayload)).toString('base64url')
  return `${payload}.${signatureFor(payload)}`
}

export const readSessionToken = (token: string): AppUser | undefined => {
  const separator = token.lastIndexOf('.')
  if (separator <= 0) return undefined

  const payload = token.slice(0, separator)
  const providedSignature = Buffer.from(token.slice(separator + 1))
  const expectedSignature = Buffer.from(signatureFor(payload))
  if (
    providedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignature, expectedSignature)
  ) return undefined

  let value: unknown
  try {
    value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return undefined
  }
  if (
    typeof value !== 'object' || value === null ||
    !('expiresAt' in value) || typeof value.expiresAt !== 'number' ||
    value.expiresAt <= Date.now() ||
    !('user' in value) || !isAppUser(value.user)
  ) return undefined

  return value.user
}
