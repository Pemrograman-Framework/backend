import type { PoolConnection } from 'mysql2/promise'
import { database } from '../config/database.js'
import { entity, field, numeric, text, type DbRow } from './helpers.js'

// Tabel: products
export const createProductTable = () =>
  database.execute(`CREATE TABLE IF NOT EXISTS products (
    id BIGINT UNSIGNED PRIMARY KEY,
    sku VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    supplier VARCHAR(255) NOT NULL,
    stock DECIMAL(14, 2) NOT NULL,
    price DECIMAL(14, 2) NOT NULL
  ) ENGINE=InnoDB`)

export const findAllProducts = async () => {
  const [rows] = await database.query<DbRow[]>(
    'SELECT id, sku, name, category, supplier, stock, price FROM products',
  )
  return rows.map((row) => ({
    id: numeric(row.id), sku: text(row.sku), nama: text(row.name), kategori: text(row.category),
    supplier: text(row.supplier), stok: numeric(row.stock), harga: numeric(row.price),
  }))
}

export const replaceProducts = async (connection: PoolConnection, rows: unknown[]) => {
  await connection.execute('DELETE FROM products')
  for (const row of rows.map(entity)) {
    await connection.execute(
      'INSERT INTO products (id, sku, name, category, supplier, stock, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [field(row, 'id'), field(row, 'sku'), field(row, 'nama'), field(row, 'kategori'), field(row, 'supplier'), field(row, 'stok'), field(row, 'harga')],
    )
  }
}
