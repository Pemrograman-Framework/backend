import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PoolConnection } from 'mysql2/promise'
import { seed } from '../../../src/data.js'
import { database } from '../config/database.js'
import { createDiscrepancyTable, findAllDiscrepancies, replaceDiscrepancies } from './discrepancyModel.js'
import { findLegacyCollections, legacyTableExists } from './legacyDataModel.js'
import { createProductTable, findAllProducts, replaceProducts } from './productModel.js'
import { createPurchaseOrderTable, findAllPurchaseOrders, replacePurchaseOrders } from './purchaseOrderModel.js'
import { createPurchaseOrderItemTable } from './purchaseOrderItemModel.js'
import { createPurchaseOrderLogTable } from './purchaseOrderLogModel.js'
import { createSchemaTable, isSchemaApplied, markSchemaApplied } from './schemaModel.js'
import { createSupplierTable, findAllSuppliers, replaceSuppliers } from './supplierModel.js'
import { createUserTable, findAllUsers, replaceUsers } from './userModel.js'

export const collectionNames = ['pos', 'suppliers', 'products', 'users', 'discrepancies'] as const
export type CollectionName = (typeof collectionNames)[number]
type DataSet = Record<CollectionName, unknown[]>
type CollectionWriter = (connection: PoolConnection, rows: unknown[]) => Promise<void>

// Setiap koleksi frontend ditulis lewat model tabelnya masing-masing.
const writers: Record<CollectionName, CollectionWriter> = {
  pos: replacePurchaseOrders,
  suppliers: replaceSuppliers,
  products: replaceProducts,
  users: replaceUsers,
  discrepancies: replaceDiscrepancies,
}

const dataPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../data/anna-brew.json')
let data: DataSet | undefined
let initialization: Promise<void> | undefined
let writeQueue = Promise.resolve()

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
  await createSchemaTable()
  await createPurchaseOrderTable()
  await createPurchaseOrderItemTable()
  await createPurchaseOrderLogTable()
  await createSupplierTable()
  await createProductTable()
  await createUserTable()
  await createDiscrepancyTable()
}

const persistAll = async (value: DataSet, markMigrated = false) => {
  const connection = await database.getConnection()
  try {
    await connection.beginTransaction()
    for (const name of collectionNames) await writers[name](connection, value[name])
    if (markMigrated) await markSchemaApplied(connection)
    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

const readNormalizedData = async (): Promise<DataSet> => {
  const [pos, suppliers, products, users, discrepancies] = await Promise.all([
    findAllPurchaseOrders(),
    findAllSuppliers(),
    findAllProducts(),
    findAllUsers(),
    findAllDiscrepancies(),
  ])
  return { pos, suppliers, products, users, discrepancies }
}

const readInitialData = async (): Promise<DataSet> => {
  if (!(await legacyTableExists())) return readLegacyData()

  const stored = await findLegacyCollections() as Partial<DataSet>
  return Object.fromEntries(collectionNames.map((name) => [
    name,
    Array.isArray(stored[name]) ? stored[name] : seed[name],
  ])) as DataSet
}

const initialize = async () => {
  await createTables()
  if (await isSchemaApplied()) {
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
      await writers[name](connection, rows)
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
