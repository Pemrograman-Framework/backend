import type { PoolConnection } from 'mysql2/promise'
import { database } from '../config/database.js'
import { entity, field, numeric, text, type DbRow, type Entity } from './helpers.js'

// Tabel: purchase_order_items
export const createPurchaseOrderItemTable = () =>
  database.execute(`CREATE TABLE IF NOT EXISTS purchase_order_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    po_id VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(64) NOT NULL,
    quantity DECIMAL(14, 2) NOT NULL,
    price DECIMAL(14, 2) NOT NULL,
    INDEX (po_id)
  ) ENGINE=InnoDB`)

// Hasil: Map po_id -> daftar item dalam bentuk yang dipakai frontend ({ n, s, q, p })
export const findAllPurchaseOrderItems = async () => {
  const [rows] = await database.query<DbRow[]>(
    'SELECT po_id, name, sku, quantity, price FROM purchase_order_items ORDER BY id',
  )
  const byPo = new Map<string, Entity[]>()
  for (const row of rows) {
    const key = text(row.po_id)
    const list = byPo.get(key) ?? []
    list.push({ n: row.name, s: row.sku, q: numeric(row.quantity), p: numeric(row.price) })
    byPo.set(key, list)
  }
  return byPo
}

export const deleteAllPurchaseOrderItems = async (connection: PoolConnection) => {
  await connection.execute('DELETE FROM purchase_order_items')
}

export const insertPurchaseOrderItems = async (connection: PoolConnection, poId: string, items: unknown[]) => {
  for (const item of items.map(entity)) {
    await connection.execute(
      'INSERT INTO purchase_order_items (po_id, name, sku, quantity, price) VALUES (?, ?, ?, ?, ?)',
      [poId, field(item, 'n'), field(item, 's'), field(item, 'q'), field(item, 'p')],
    )
  }
}
