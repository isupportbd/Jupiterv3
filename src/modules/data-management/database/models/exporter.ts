import { sql } from "drizzle-orm";
import { index, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const exporters = pgTable("exporters", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  code: varchar("code", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("idx_exporters_name_trgm").using("gin", sql`${table.name} gin_trgm_ops`)
]);
