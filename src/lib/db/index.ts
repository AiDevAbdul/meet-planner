import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) {
  console.warn('[db] DATABASE_URL is not set — database queries will fail')
}

const sql = neon(url || 'postgresql://user:pass@localhost/placeholder')
export const db = drizzle(sql, { schema })

export type DB = typeof db
