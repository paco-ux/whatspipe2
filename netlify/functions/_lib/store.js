import { getStore } from '@netlify/blobs'
import crypto from 'node:crypto'

const store = getStore('templates')
const KEY = 'all.json'

export async function readAllTemplates() {
  try {
    const data = await store.get(KEY, { type: 'json' })
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function writeAllTemplates(arr) {
  await store.set(KEY, JSON.stringify(arr), {
    metadata: { contentType: 'application/json; charset=utf-8' }
  })
  return true
}

export const genId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now())

export const nowISO = () => new Date().toISOString()
