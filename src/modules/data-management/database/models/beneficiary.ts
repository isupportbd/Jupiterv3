import { sql } from "drizzle-orm";
import { index, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const beneficiaries = pgTable("beneficiaries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("idx_beneficiaries_name_trgm").using("gin", sql`${table.name} gin_trgm_ops`)
]);
