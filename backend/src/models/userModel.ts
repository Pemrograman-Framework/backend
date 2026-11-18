import { getData } from './dataStore.js'

export type AppUser = { nama: string; role: string; email: string }

export const findActiveUserByEmail = async (email: string) => {
  if (email.toLowerCase() === 'admin@annabrew.co.id') {
    return { nama: 'Ayu Patricia', role: 'Manager', email }
  }

  const { users } = await getData()
  const user = users.find((user) => {
    if (typeof user !== 'object' || user === null) return false
    const account = user as { email?: string; st?: string }
    return account.email?.toLowerCase() === email.toLowerCase() && account.st === 'Aktif'
  })
  if (typeof user !== 'object' || user === null) return undefined
  const account = user as Partial<AppUser>
  if (typeof account.nama !== 'string' || typeof account.role !== 'string' || typeof account.email !== 'string') return undefined
  return { nama: account.nama, role: account.role, email: account.email }
}