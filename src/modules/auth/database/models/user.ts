import { relations } from "drizzle-orm";
import { boolean, integer, numeric, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { roles } from "@/modules/auth/database/models/role.js";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  roleId: integer("role_id").references(() => roles.id, { onUpdate: "cascade", onDelete: "set null" }),
  adminId: integer("admin_id").references((): any => users.id, { onUpdate: "cascade", onDelete: "set null" }),
  phone: varchar("phone", { length: 50 }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedBy: integer("approved_by").references((): any => users.id, { onUpdate: "cascade", onDelete: "set null" }),
  subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
  walletBalance: numeric("wallet_balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const loginOtpTokens = pgTable("login_otp_tokens", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  otp: varchar("otp", { length: 10 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onUpdate: "cascade", onDelete: "set null" }),
  jti: varchar("jti", { length: 191 }).notNull().unique(),
  revoked: boolean("revoked").default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id]
  }),
  parentAdmin: one(users, {
    fields: [users.adminId],
    references: [users.id],
    relationName: "office_staff"
  }),
  staff: many(users, {
    relationName: "office_staff"
  })
}));
