import type { PoolConnection } from 'mysql2/promise'
import { database } from '../config/database.js'
import type { DbRow } from './helpers.js'

// Tabel: anna_brew_schema (pencatatan versi skema)
export const SCHEMA_VERSION = 1

export const createSchemaTable = () =>
  database.execute(`CREATE TABLE IF NOT EXISTS anna_brew_schema (
    version INT PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`)

export const isSchemaApplied = async () => {
  const [rows] = await database.query<DbRow[]>(
    'SELECT version FROM anna_brew_schema WHERE version = ?',
    [SCHEMA_VERSION],
  )
  return rows.length > 0
}

export const markSchemaApplied = async (connection: PoolConnection) => {
  await connection.execute('INSERT INTO anna_brew_schema (version) VALUES (?)', [SCHEMA_VERSION])
}
