import { desc, eq, sql } from "drizzle-orm"

import type { Database } from "../db/index.js"
import { type LinkRow, links } from "../db/schema.js"
import type { Link } from "../domain/link.js"
import { ShortCodeAlreadyExistsError } from "../errors/links-errors.js"

export interface LinksRepository {
  findByShortCode(shortCode: string): Promise<Link | null>
  findById(id: string): Promise<Link | null>
  list(page: number, pageSize: number): Promise<{ data: Link[]; total: number }>
  create(input: { id: string; originalUrl: string; shortCode: string }): Promise<Link>
  delete(id: string): Promise<boolean>
  incrementAccess(id: string): Promise<number | null>
}

function toLink(row: LinkRow): Link {
  return {
    id: row.id,
    originalUrl: row.originalUrl,
    shortCode: row.shortCode,
    accessCount: row.accessCount,
    createdAt: row.createdAt,
  }
}

export function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  const pgError = (error as { cause?: { code?: string } }).cause
  const code = pgError?.code ?? (error as { code?: string }).code
  return code === "23505"
}

export function createLinksRepository(db: Database): LinksRepository {
  return {
    async findByShortCode(shortCode) {
      const rows = await db.select().from(links).where(eq(links.shortCode, shortCode)).limit(1)
      return rows[0] ? toLink(rows[0]) : null
    },

    async findById(id) {
      const rows = await db.select().from(links).where(eq(links.id, id)).limit(1)
      return rows[0] ? toLink(rows[0]) : null
    },

    async list(page, pageSize) {
      const [rows, totalRows] = await Promise.all([
        db
          .select()
          .from(links)
          .orderBy(desc(links.createdAt))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
        db.select({ count: sql<number>`count(*)` }).from(links),
      ])
      return { data: rows.map(toLink), total: Number(totalRows[0]?.count ?? 0) }
    },

    async create(input) {
      try {
        const rows = await db.insert(links).values(input).returning()
        return toLink(rows[0])
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ShortCodeAlreadyExistsError()
        }
        throw error
      }
    },

    async delete(id) {
      const rows = await db.delete(links).where(eq(links.id, id)).returning({ id: links.id })
      return rows.length > 0
    },

    async incrementAccess(id) {
      const rows = await db
        .update(links)
        .set({ accessCount: sql<number>`${links.accessCount} + 1` })
        .where(eq(links.id, id))
        .returning({ accessCount: links.accessCount })
      return rows[0]?.accessCount ?? null
    },
  }
}
