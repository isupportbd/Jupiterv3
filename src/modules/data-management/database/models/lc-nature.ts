import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const lcNatures = pgTable("lc_natures", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
