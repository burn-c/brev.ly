import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { env } from "../env.js"
import * as schema from "./schema.js"

export function createDb(connectionString = env.DATABASE_URL) {
  const pool = connectionString ? new Pool({ connectionString }) : new Pool()

  return {
    db: drizzle(pool, { schema }),
    pool,
  }
}

export type Database = ReturnType<typeof createDb>["db"]
