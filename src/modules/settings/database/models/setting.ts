import { date, decimal, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const billingSettings = pgTable("billing_settings", {
  id: serial("id").primaryKey(),
  monthlyFee: decimal("monthly_fee", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 100 }).notNull(),
  accountNo: varchar("account_no", { length: 100 }).notNull(),
  activationDate: date("activation_date").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
