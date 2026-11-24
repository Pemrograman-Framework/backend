import type { PoolConnection } from 'mysql2/promise'
import { database } from '../config/database.js'
import { entity, field, numeric, text, type DbRow } from './helpers.js'

// Tabel: suppliers
export const createSupplierTable = () =>
  database.execute(`CREATE TABLE IF NOT EXISTS suppliers (
    id BIGINT UNSIGNED PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(64) NOT NULL,
    city VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    status VARCHAR(64) NOT NULL
  ) ENGINE=InnoDB`)

export const findAllSuppliers = async () => {
  const [rows] = await database.query<DbRow[]>(
    'SELECT id, code, name, email, phone, city, address, status FROM suppliers',
  )
  return rows.map((row) => ({
    id: numeric(row.id), kode: text(row.code), nama: text(row.name), email: text(row.email),
    tel: text(row.phone), kota: text(row.city), alamat: text(row.address), st: text(row.status),
  }))
}

export const replaceSuppliers = async (connection: PoolConnection, rows: unknown[]) => {
  await connection.execute('DELETE FROM suppliers')
  for (const row of rows.map(entity)) {
    await connection.execute(
      'INSERT INTO suppliers (id, code, name, email, phone, city, address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [field(row, 'id'), field(row, 'kode'), field(row, 'nama'), field(row, 'email'), field(row, 'tel'), field(row, 'kota'), field(row, 'alamat'), field(row, 'st')],
    )
  }
}
