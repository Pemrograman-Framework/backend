import type { NextFunction, Request, Response } from 'express'
import { collectionNames, getData, replaceCollection, type CollectionName } from '../models/dataStore.js'

export const readData = async (_request: Request, response: Response, next: NextFunction) => {
  try {
    response.json(await getData())
  } catch (error) {
    next(error)
  }
}

export const writeCollection = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const { collection } = request.params
    if (!collectionNames.includes(collection as CollectionName)) {
      response.status(404).json({ error: 'Unknown data collection.' })
      return
    }
    if (!Array.isArray(request.body)) {
      response.status(400).json({ error: 'Request body must be an array.' })
      return
    }
    response.json({ data: await replaceCollection(collection as CollectionName, request.body) })
  } catch (error) {
    next(error)
  }
}