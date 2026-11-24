import type { PoolConnection } from 'mysql2/promise'
import { database } from '../config/database.js'
import { entity, field, numeric, text, type DbRow } from './helpers.js'

// Tabel: users
export type AppUser = { nama: string; role: string; email: string }

export const createUserTable = () =>
  database.execute(`CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL,
    status VARCHAR(64) NOT NULL,
    joined_at VARCHAR(64) NOT NULL
  ) ENGINE=InnoDB`)

export const findAllUsers = async () => {
  const [rows] = await database.query<DbRow[]>(
    'SELECT id, name, email, location, role, status, joined_at FROM users',
  )
  return rows.map((row) => ({
    id: numeric(row.id), nama: text(row.name), email: text(row.email), lokasi: text(row.location),
    role: text(row.role), st: text(row.status), gabung: text(row.joined_at),
  }))
}

export const replaceUsers = async (connection: PoolConnection, rows: unknown[]) => {
  await connection.execute('DELETE FROM users')
  for (const row of rows.map(entity)) {
    await connection.execute(
      'INSERT INTO users (id, name, email, location, role, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [field(row, 'id'), field(row, 'nama'), field(row, 'email'), field(row, 'lokasi'), field(row, 'role'), field(row, 'st'), field(row, 'gabung')],
    )
  }
}

// Dipakai authController saat login. Tabel sudah disiapkan saat server start (lihat server.ts).
export const findActiveUserByEmail = async (email: string): Promise<AppUser | undefined> => {
  if (email.toLowerCase() === 'admin@annabrew.co.id') {
    return { nama: 'Ayu Patricia', role: 'Manager', email }
  }
  const [rows] = await database.query<DbRow[]>(
    "SELECT name, role, email FROM users WHERE LOWER(email) = LOWER(?) AND status = 'Aktif' LIMIT 1",
    [email],
  )
  const row = rows[0]
  if (!row) return undefined
  return { nama: text(row.name), role: text(row.role), email: text(row.email) }
}
