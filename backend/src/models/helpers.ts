import type { RowDataPacket } from 'mysql2/promise'

export type DbRow = RowDataPacket & Record<string, unknown>
export type Entity = Record<string, unknown>

export const entity = (value: unknown): Entity =>
  typeof value === 'object' && value !== null ? value as Entity : {}

export const field = (row: Entity, key: string): string | number | null => {
  const value = row[key]
  return typeof value === 'string' || typeof value === 'number' ? value : null
}

export const text = (value: unknown) => value == null ? '' : String(value)
export const numeric = (value: unknown) => Number(value || 0)
