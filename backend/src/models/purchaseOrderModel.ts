import type { PoolConnection } from 'mysql2/promise'
import { database } from '../config/database.js'
import { entity, field, text, type DbRow } from './helpers.js'
import { deleteAllPurchaseOrderItems, findAllPurchaseOrderItems, insertPurchaseOrderItems } from './purchaseOrderItemModel.js'
import { deleteAllPurchaseOrderLogs, findAllPurchaseOrderLogs, insertPurchaseOrderLogs } from './purchaseOrderLogModel.js'

// Tabel: purchase_orders (koleksi "pos" = purchase_orders + items + logs)
export const createPurchaseOrderTable = () =>
  database.execute(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(32) PRIMARY KEY,
    supplier VARCHAR(255) NOT NULL,
    order_date VARCHAR(64) NOT NULL,
    due_date VARCHAR(64) NOT NULL,
    status VARCHAR(64) NOT NULL,
    eta VARCHAR(128) NOT NULL
  ) ENGINE=InnoDB`)

export const findAllPurchaseOrders = async () => {
  const [[rows], items, logs] = await Promise.all([
    database.query<DbRow[]>('SELECT id, supplier, order_date, due_date, status, eta FROM purchase_orders'),
    findAllPurchaseOrderItems(),
    findAllPurchaseOrderLogs(),
  ])
  return rows.map((row) => ({
    id: text(row.id), sup: text(row.supplier), tgl: text(row.order_date), due: text(row.due_date),
    st: text(row.status), eta: text(row.eta), items: items.get(text(row.id)) || [], logs: logs.get(text(row.id)) || [],
  }))
}

export const replacePurchaseOrders = async (connection: PoolConnection, rows: unknown[]) => {
  await deleteAllPurchaseOrderLogs(connection)
  await deleteAllPurchaseOrderItems(connection)
  await connection.execute('DELETE FROM purchase_orders')
  for (const row of rows.map(entity)) {
    const id = text(row.id)
    await connection.execute(
      'INSERT INTO purchase_orders (id, supplier, order_date, due_date, status, eta) VALUES (?, ?, ?, ?, ?, ?)',
      [id, field(row, 'sup'), field(row, 'tgl'), field(row, 'due'), field(row, 'st'), field(row, 'eta')],
    )
    await insertPurchaseOrderItems(connection, id, Array.isArray(row.items) ? row.items : [])
    await insertPurchaseOrderLogs(connection, id, Array.isArray(row.logs) ? row.logs : [])
  }
}
