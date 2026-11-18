import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PoolConnection, RowDataPacket } from 'mysql2/promise'
import { seed } from '../../../src/data.js'
import { database } from '../config/database.js'

export const collectionNames = ['pos', 'suppliers', 'products', 'users', 'discrepancies'] as const
export type CollectionName = (typeof collectionNames)[number]
type DataSet = Record<CollectionName, unknown[]>

const dataPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/anna-brew.json')
let data: DataSet | undefined
let initialization: Promise<void> | undefined
let writeQueue = Promise.resolve()

type CollectionRow = RowDataPacket & { collection_name: string; payload: unknown }
type DbRow = RowDataPacket & Record<string, unknown>
type Entity = Record<string, unknown>

const entity = (value: unknown): Entity =>
  typeof value === 'object' && value !== null ? value as Entity : {}
const field = (row: Entity, key: string): string | number | null => {
  const value = row[key]
  return typeof value === 'string' || typeof value === 'number' ? value : null
}
const text = (value: unknown) => value == null ? '' : String(value)
const numeric = (value: unknown) => Number(value || 0)

const isDataSet = (value: unknown): value is DataSet =>
  typeof value === 'object' && value !== null &&
  collectionNames.every((name) => Array.isArray((value as Record<string, unknown>)[name]))

const readLegacyData = async (): Promise<DataSet> => {
  try {
    const parsed: unknown = JSON.parse(await readFile(dataPath, 'utf8'))
    if (!isDataSet(parsed)) throw new Error('Stored Anna Brew data has an invalid shape.')
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return structuredClone(seed) as DataSet
  }
}

const createTables = async () => {
  const schemas = [
    `CREATE TABLE IF NOT EXISTS anna_brew_schema (
      version INT PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id VARCHAR(32) PRIMARY KEY,
      supplier VARCHAR(255) NOT NULL,
      order_date VARCHAR(64) NOT NULL,
      due_date VARCHAR(64) NOT NULL,
      status VARCHAR(64) NOT NULL,
      eta VARCHAR(128) NOT NULL
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS purchase_order_items (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      po_id VARCHAR(32) NOT NULL,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(64) NOT NULL,
      quantity DECIMAL(14, 2) NOT NULL,
      price DECIMAL(14, 2) NOT NULL,
      INDEX (po_id)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS purchase_order_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      po_id VARCHAR(32) NOT NULL,
      event VARCHAR(255) NOT NULL,
      actor VARCHAR(255) NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      INDEX (po_id)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS suppliers (
      id BIGINT UNSIGNED PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(64) NOT NULL,
      city VARCHAR(255) NOT NULL,
      address TEXT NOT NULL,
      status VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS products (
      id BIGINT UNSIGNED PRIMARY KEY,
      sku VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(128) NOT NULL,
      supplier VARCHAR(255) NOT NULL,
      stock DECIMAL(14, 2) NOT NULL,
      price DECIMAL(14, 2) NOT NULL
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      location VARCHAR(255) NOT NULL,
      role VARCHAR(64) NOT NULL,
      status VARCHAR(64) NOT NULL,
      joined_at VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS discrepancies (
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
    ) ENGINE=InnoDB`,
  ]
  for (const schema of schemas) await database.execute(schema)
}

const persistCollection = async (connection: PoolConnection, name: CollectionName, rows: unknown[]) => {
  const entities = rows.map(entity)
  if (name === 'pos') {
    await connection.execute('DELETE FROM purchase_order_logs')
    await connection.execute('DELETE FROM purchase_order_items')
    await connection.execute('DELETE FROM purchase_orders')
    for (const row of entities) {
      const id = text(row.id)
      await connection.execute(
        'INSERT INTO purchase_orders (id, supplier, order_date, due_date, status, eta) VALUES (?, ?, ?, ?, ?, ?)',
        [id, field(row, 'sup'), field(row, 'tgl'), field(row, 'due'), field(row, 'st'), field(row, 'eta')],
      )
      const items = Array.isArray(row.items) ? row.items.map(entity) : []
      for (const item of items) {
        await connection.execute(
          'INSERT INTO purchase_order_items (po_id, name, sku, quantity, price) VALUES (?, ?, ?, ?, ?)',
          [id, field(item, 'n'), field(item, 's'), field(item, 'q'), field(item, 'p')],
        )
      }
      const logs = Array.isArray(row.logs) ? row.logs.map(entity) : []
      for (const log of logs) {
        await connection.execute(
          'INSERT INTO purchase_order_logs (po_id, event, actor, created_at) VALUES (?, ?, ?, ?)',
          [id, field(log, 't'), field(log, 'who'), field(log, 'ts')],
        )
      }
    }
    return
  }

  const definitions = {
    suppliers: {
      table: 'suppliers', columns: 'id, code, name, email, phone, city, address, status',
      values: (row: Entity) => [field(row, 'id'), field(row, 'kode'), field(row, 'nama'), field(row, 'email'), field(row, 'tel'), field(row, 'kota'), field(row, 'alamat'), field(row, 'st')],
    },
    products: {
      table: 'products', columns: 'id, sku, name, category, supplier, stock, price',
      values: (row: Entity) => [field(row, 'id'), field(row, 'sku'), field(row, 'nama'), field(row, 'kategori'), field(row, 'supplier'), field(row, 'stok'), field(row, 'harga')],
    },
    users: {
      table: 'users', columns: 'id, name, email, location, role, status, joined_at',
      values: (row: Entity) => [field(row, 'id'), field(row, 'nama'), field(row, 'email'), field(row, 'lokasi'), field(row, 'role'), field(row, 'st'), field(row, 'gabung')],
    },
    discrepancies: {
      table: 'discrepancies', columns: 'id, po_id, supplier, type, report_date, status, description, loss, quantity, reported_by',
      values: (row: Entity) => [field(row, 'id'), field(row, 'po'), field(row, 'sup'), field(row, 'jenis'), field(row, 'tgl'), field(row, 'st'), field(row, 'desc'), field(row, 'rugi'), field(row, 'qty'), field(row, 'by')],
    },
  } as const
  const definition = definitions[name as keyof typeof definitions]
  await connection.execute(`DELETE FROM ${definition.table}`)
  const placeholders = definition.columns.split(', ').map(() => '?').join(', ')
  for (const row of entities) {
    await connection.execute(
      `INSERT INTO ${definition.table} (${definition.columns}) VALUES (${placeholders})`,
      definition.values(row),
    )
  }
}

const persistAll = async (value: DataSet, markMigrated = false) => {
  const connection = await database.getConnection()
  try {
    await connection.beginTransaction()
    for (const name of collectionNames) await persistCollection(connection, name, value[name])
    if (markMigrated) await connection.execute('INSERT INTO anna_brew_schema (version) VALUES (1)')
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

const readNormalizedData = async (): Promise<DataSet> => {
  const [[posRows], [itemRows], [logRows], [supplierRows], [productRows], [userRows], [discrepancyRows]] = await Promise.all([
    database.query<DbRow[]>('SELECT id, supplier, order_date, due_date, status, eta FROM purchase_orders'),
    database.query<DbRow[]>('SELECT po_id, name, sku, quantity, price FROM purchase_order_items ORDER BY id'),
    database.query<DbRow[]>('SELECT po_id, event, actor, created_at FROM purchase_order_logs ORDER BY id'),
    database.query<DbRow[]>('SELECT id, code, name, email, phone, city, address, status FROM suppliers'),
    database.query<DbRow[]>('SELECT id, sku, name, category, supplier, stock, price FROM products'),
    database.query<DbRow[]>('SELECT id, name, email, location, role, status, joined_at FROM users'),
    database.query<DbRow[]>('SELECT id, po_id, supplier, type, report_date, status, description, loss, quantity, reported_by FROM discrepancies'),
  ])
  const items = new Map<string, Entity[]>()
  for (const row of itemRows) {
    const key = text(row.po_id)
    items.set(key, [...(items.get(key) || []), { n: row.name, s: row.sku, q: numeric(row.quantity), p: numeric(row.price) }])
  }
  const logs = new Map<string, Entity[]>()
  for (const row of logRows) {
    const key = text(row.po_id)
    logs.set(key, [...(logs.get(key) || []), { t: row.event, who: row.actor, ts: row.created_at }])
  }
  return {
    pos: posRows.map((row) => ({
      id: text(row.id), sup: text(row.supplier), tgl: text(row.order_date), due: text(row.due_date),
      st: text(row.status), eta: text(row.eta), items: items.get(text(row.id)) || [], logs: logs.get(text(row.id)) || [],
    })),
    suppliers: supplierRows.map((row) => ({ id: numeric(row.id), kode: text(row.code), nama: text(row.name), email: text(row.email), tel: text(row.phone), kota: text(row.city), alamat: text(row.address), st: text(row.status) })),
    products: productRows.map((row) => ({ id: numeric(row.id), sku: text(row.sku), nama: text(row.name), kategori: text(row.category), supplier: text(row.supplier), stok: numeric(row.stock), harga: numeric(row.price) })),
    users: userRows.map((row) => ({ id: numeric(row.id), nama: text(row.name), email: text(row.email), lokasi: text(row.location), role: text(row.role), st: text(row.status), gabung: text(row.joined_at) })),
    discrepancies: discrepancyRows.map((row) => ({ id: text(row.id), po: text(row.po_id), sup: text(row.supplier), jenis: text(row.type), tgl: text(row.report_date), st: text(row.status), desc: text(row.description), rugi: numeric(row.loss), qty: text(row.quantity), by: text(row.reported_by) })),
  }
}

const readInitialData = async (): Promise<DataSet> => {
  const [tables] = await database.query<DbRow[]>(
    "SELECT TABLE_NAME AS table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'anna_brew_data'",
  )
  if (tables.length === 0) return readLegacyData()

  const [rows] = await database.query<CollectionRow[]>('SELECT collection_name, payload FROM anna_brew_data')
  const stored = Object.fromEntries(rows.map(({ collection_name, payload }) => [
    collection_name,
    typeof payload === 'string' ? JSON.parse(payload) : payload,
  ])) as Partial<DataSet>
  return Object.fromEntries(collectionNames.map((name) => [
    name,
    Array.isArray(stored[name]) ? stored[name] : seed[name],
  ])) as DataSet
}

const initialize = async () => {
  await createTables()
  const [versions] = await database.query<DbRow[]>('SELECT version FROM anna_brew_schema WHERE version = 1')
  if (versions.length > 0) {
    data = await readNormalizedData()
    return
  }
  data = await readInitialData()
  await persistAll(data, true)
}

export const getData = async (): Promise<DataSet> => {
  if (data) return structuredClone(data)
  if (!initialization) initialization = initialize()
  try {
    await initialization
  } catch (error) {
    initialization = undefined
    throw error
  }
  return structuredClone(data!)
}

export const replaceCollection = async (name: CollectionName, rows: unknown[]) => {
  await getData()
  const operation = writeQueue.catch(() => {}).then(async () => {
    const connection = await database.getConnection()
    try {
      await connection.beginTransaction()
      await persistCollection(connection, name, rows)
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
    const next = { ...data!, [name]: rows }
    data = next
  })
  writeQueue = operation
  await operation
  return structuredClone(rows)
}