import type { PoolConnection } from 'mysql2/promise'
import { database } from '../config/database.js'
import { entity, field, text, type DbRow, type Entity } from './helpers.js'

// Tabel: purchase_order_logs
export const createPurchaseOrderLogTable = () =>
  database.execute(`CREATE TABLE IF NOT EXISTS purchase_order_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    po_id VARCHAR(32) NOT NULL,
    event VARCHAR(255) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    created_at VARCHAR(64) NOT NULL,
    INDEX (po_id)
  ) ENGINE=InnoDB`)

// Hasil: Map po_id -> daftar log dalam bentuk yang dipakai frontend ({ t, who, ts })
export const findAllPurchaseOrderLogs = async () => {
  const [rows] = await database.query<DbRow[]>(
    'SELECT po_id, event, actor, created_at FROM purchase_order_logs ORDER BY id',
  )
  const byPo = new Map<string, Entity[]>()
  for (const row of rows) {
    const key = text(row.po_id)
    const list = byPo.get(key) ?? []
    list.push({ t: row.event, who: row.actor, ts: row.created_at })
    byPo.set(key, list)
  }
  return byPo
}

export const deleteAllPurchaseOrderLogs = async (connection: PoolConnection) => {
  await connection.execute('DELETE FROM purchase_order_logs')
}

export const insertPurchaseOrderLogs = async (connection: PoolConnection, poId: string, logs: unknown[]) => {
  for (const log of logs.map(entity)) {
    await connection.execute(
      'INSERT INTO purchase_order_logs (po_id, event, actor, created_at) VALUES (?, ?, ?, ?)',
      [poId, field(log, 't'), field(log, 'who'), field(log, 'ts')],
    )
  }
}
