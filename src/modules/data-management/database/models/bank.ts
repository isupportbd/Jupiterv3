import { relations } from "drizzle-orm";
import { pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { branches } from "./branch.js";

export const banks = pgTable("banks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const banksRelations = relations(banks, ({ many }) => ({
  branches: many(branches)
}));
