import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/database/models/user.js";

export const paymentHistory = pgTable("payment_history", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => users.id, { onUpdate: "cascade", onDelete: "cascade" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  trxId: varchar("trx_id", { length: 100 }).notNull().unique(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: integer("approved_by").references(() => users.id, { onUpdate: "cascade", onDelete: "set null" })
});

export const paymentHistoryRelations = relations(paymentHistory, ({ one }) => ({
  admin: one(users, {
    fields: [paymentHistory.adminId],
    references: [users.id],
    relationName: "admin_payments"
  }),
  approver: one(users, {
    fields: [paymentHistory.approvedBy],
    references: [users.id]
  })
}));
