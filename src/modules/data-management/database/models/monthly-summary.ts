import { integer, numeric, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const monthlyLcSummaries = pgTable("monthly_lc_summaries", {
  monthKey: varchar("month_key", { length: 7 }).primaryKey(), // e.g. "2024-05"
  totalRecords: integer("total_records").default(0).notNull(),
  totalLcReg: integer("total_lc_reg").default(0).notNull(),
  totalLcUnq: integer("total_lc_unq").default(0).notNull(),
  totalBenReg: integer("total_ben_reg").default(0).notNull(),
  totalBenUnq: integer("total_ben_unq").default(0).notNull(),
  totalBankReg: integer("total_bank_reg").default(0).notNull(),
  totalBankUnq: integer("total_bank_unq").default(0).notNull(),
  totalValue: numeric("total_value", { precision: 15, scale: 2 }).default("0").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
