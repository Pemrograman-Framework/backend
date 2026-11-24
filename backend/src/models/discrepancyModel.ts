import type { PoolConnection } from 'mysql2/promise'
import { database } from '../config/database.js'
import { entity, field, numeric, text, type DbRow } from './helpers.js'

// Tabel: discrepancies
export const createDiscrepancyTable = () =>
  database.execute(`CREATE TABLE IF NOT EXISTS discrepancies (
    id VARCHAR(32) PRIMARY KEY,
    po_id VARCHAR(32) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    type VARCHAR(128) NOT NULL,
    report_date VARCHAR(64) NOT NULL,
    status VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    loss DECIMAL(14, 2) NOT NULL,
    quantity VARCHAR(128) NOT NULL,
    reported_by VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB`)

export const findAllDiscrepancies = async () => {
  const [rows] = await database.query<DbRow[]>(
    'SELECT id, po_id, supplier, type, report_date, status, description, loss, quantity, reported_by FROM discrepancies',
  )
  return rows.map((row) => ({
    id: text(row.id), po: text(row.po_id), sup: text(row.supplier), jenis: text(row.type), tgl: text(row.report_date),
    st: text(row.status), desc: text(row.description), rugi: numeric(row.loss), qty: text(row.quantity), by: text(row.reported_by),
  }))
}

export const replaceDiscrepancies = async (connection: PoolConnection, rows: unknown[]) => {
  await connection.execute('DELETE FROM discrepancies')
  for (const row of rows.map(entity)) {
    await connection.execute(
      'INSERT INTO discrepancies (id, po_id, supplier, type, report_date, status, description, loss, quantity, reported_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [field(row, 'id'), field(row, 'po'), field(row, 'sup'), field(row, 'jenis'), field(row, 'tgl'), field(row, 'st'), field(row, 'desc'), field(row, 'rugi'), field(row, 'qty'), field(row, 'by')],
    )
  }
}
