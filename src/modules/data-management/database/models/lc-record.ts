import { relations } from "drizzle-orm";
import { bigint, bigserial, index, integer, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "@/modules/auth/database/models/user.js";
import { lcs } from "./lc.js";

/**
 * LC Records / Shipments Table (3NF Normalized).
 * Stores individual shipments, entries, and operational tracking under a Master LC.
 */
export const lcRecords = pgTable("lc_records", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: integer("user_id").references(() => users.id, { onUpdate: "cascade", onDelete: "set null" }),

  // Foreign Key to Master LC:
  lcMasterId: bigint("lc_master_id", { mode: "number" })
    .notNull()
    .references(() => lcs.id, { onUpdate: "cascade", onDelete: "cascade" }),

  // Shipment / Transaction Specific Fields:
  lcSerial: varchar("lc_serial", { length: 50 }),
  bbUsansePeriod: varchar("bb_usanse_period", { length: 100 }),
  lastShipDate: timestamp("last_ship_date", { withTimezone: true }),
  piNumber: varchar("pi_number", { length: 150 }),
  piDate: timestamp("pi_date", { withTimezone: true }),
  bondLicense: varchar("bond_license", { length: 150 }),
  accepted: varchar("accepted", { length: 100 }),
  cancelYn: varchar("cancel_yn", { length: 10 }).default("N"),
  cancelCause: varchar("cancel_cause", { length: 255 }),
  entryDate: timestamp("entry_date", { withTimezone: true }),

  recordHash: varchar("record_hash", { length: 64 }).unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("idx_lc_records_lc_master_id").on(table.lcMasterId),
  index("idx_lc_records_entry_date").on(table.entryDate),
  index("idx_lc_records_entry_date_lc_master_id").on(table.entryDate, table.lcMasterId),
  index("idx_lc_records_lc_master_id_entry_date").on(table.lcMasterId, table.entryDate)
]);

export const lcRecordsRelations = relations(lcRecords, ({ one }) => ({
  user: one(users, {
    fields: [lcRecords.userId],
    references: [users.id]
  }),
  master: one(lcs, {
    fields: [lcRecords.lcMasterId],
    references: [lcs.id]
  })
}));
