import { relations } from "drizzle-orm";
import { bigserial, index, integer, numeric, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { banks } from "./bank.js";
import { beneficiaries } from "./beneficiary.js";
import { branches } from "./branch.js";
import { exporters } from "./exporter.js";
import { lcNatures } from "./lc-nature.js";

/**
 * Master LC Table (3NF Normalized).
 * Stores unique LC contract identities, limits, dates, and associated parties.
 */
export const lcs = pgTable("lcs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  lcId: varchar("lc_id", { length: 100 }).notNull().unique(),
  lcYear: varchar("lc_year", { length: 10 }),
  lcValue: numeric("lc_value", { precision: 15, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 10 }).default("USD"),
  lcDate: timestamp("lc_date", { withTimezone: true }),
  lcExpiryDate: timestamp("lc_expiry_date", { withTimezone: true }),

  // Foreign keys to normalized master parties
  openingBankId: integer("opening_bank_id").references(() => banks.id, { onUpdate: "cascade", onDelete: "set null" }),
  openingBranchId: integer("opening_branch_id").references(() => branches.id, { onUpdate: "cascade", onDelete: "set null" }),
  beneficiaryBankId: integer("beneficiary_bank_id").references(() => banks.id, { onUpdate: "cascade", onDelete: "set null" }),
  beneficiaryBranchId: integer("beneficiary_branch_id").references(() => branches.id, { onUpdate: "cascade", onDelete: "set null" }),
  natureId: integer("nature_id").references(() => lcNatures.id, { onUpdate: "cascade", onDelete: "set null" }),
  exporterId: integer("exporter_id").references(() => exporters.id, { onUpdate: "cascade", onDelete: "set null" }),
  beneficiaryId: integer("beneficiary_id").references(() => beneficiaries.id, { onUpdate: "cascade", onDelete: "set null" }),
  applicantName: varchar("applicant_name", { length: 255 }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index("idx_lcs_beneficiary_id").on(table.beneficiaryId),
  index("idx_lcs_exporter_id").on(table.exporterId),
  index("idx_lcs_opening_bank_id").on(table.openingBankId),
  index("idx_lcs_beneficiary_bank_id").on(table.beneficiaryBankId),
  index("idx_lcs_beneficiary_id_opening_bank_id").on(table.beneficiaryId, table.openingBankId)
]);

export const lcsRelations = relations(lcs, ({ one, many }) => ({
  openingBank: one(banks, {
    fields: [lcs.openingBankId],
    references: [banks.id]
  }),
  openingBranch: one(branches, {
    fields: [lcs.openingBranchId],
    references: [branches.id]
  }),
  beneficiaryBank: one(banks, {
    fields: [lcs.beneficiaryBankId],
    references: [banks.id]
  }),
  beneficiaryBranch: one(branches, {
    fields: [lcs.beneficiaryBranchId],
    references: [branches.id]
  }),
  nature: one(lcNatures, {
    fields: [lcs.natureId],
    references: [lcNatures.id]
  }),
  exporter: one(exporters, {
    fields: [lcs.exporterId],
    references: [exporters.id]
  }),
  beneficiary: one(beneficiaries, {
    fields: [lcs.beneficiaryId],
    references: [beneficiaries.id]
  })
}));
