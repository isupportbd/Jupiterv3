import { relations } from "drizzle-orm";
import { integer, pgTable, serial, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { banks } from "./bank.js";

export const branches = pgTable(
  "branches",
  {
    id: serial("id").primaryKey(),
    bankId: integer("bank_id")
      .notNull()
      .references(() => banks.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    adsCode: varchar("ads_code", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    unique("bank_branch_ads_idx").on(table.bankId, table.name, table.adsCode)
  ]
);

export const branchesRelations = relations(branches, ({ one }) => ({
  bank: one(banks, {
    fields: [branches.bankId],
    references: [banks.id]
  })
}));
