import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const links = pgTable("links", {
  id: uuid("id").primaryKey(),
  originalUrl: text("original_url").notNull(),
  shortCode: text("short_code").notNull().unique(),
  accessCount: integer("access_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export type LinkRow = typeof links.$inferSelect
export type NewLinkRow = typeof links.$inferInsert
