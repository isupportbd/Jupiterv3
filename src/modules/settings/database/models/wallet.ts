import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/database/models/user.js";

export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => users.id, { onUpdate: "cascade", onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // 'recharge' | 'deduction'
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),
  description: text("description").notNull(),
  referenceId: varchar("reference_id", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  admin: one(users, {
    fields: [walletTransactions.adminId],
    references: [users.id]
  })
}));
