import type { RowDataPacket } from 'mysql2/promise'
import { database } from '../config/database.js'
import type { DbRow } from './helpers.js'

// Tabel: anna_brew_data (tabel lama: collection_name + payload JSON)
// Hanya dibaca untuk impor awal; tidak dibuat ulang dan tidak ditulis.
type LegacyRow = RowDataPacket & { collection_name: string; payload: unknown }

export const legacyTableExists = async () => {
  const [tables] = await database.query<DbRow[]>(
    "SELECT TABLE_NAME AS table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'anna_brew_data'",
  )
  return tables.length > 0
}

export const findLegacyCollections = async (): Promise<Record<string, unknown>> => {
  const [rows] = await database.query<LegacyRow[]>('SELECT collection_name, payload FROM anna_brew_data')
  return Object.fromEntries(rows.map(({ collection_name, payload }) => [
    collection_name,
    typeof payload === 'string' ? JSON.parse(payload) : payload,
  ]))
}
