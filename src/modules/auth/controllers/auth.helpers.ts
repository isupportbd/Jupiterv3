import { createHash, randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { authConfig, jwtConfig } from "@/config/index.js";
import { cookie, db, disconnectUserSockets, jwt } from "@/framework/facade.js";
import { refreshTokens } from "@/modules/auth/database/models/user.js";
import { users } from "@/modules/auth/database/models/user.js";

export function normalizeRole(role?: string | null): string {
  return String(role || "").toLowerCase().replace(/_/g, "");
}

export function isSuperAdmin(role?: string | null): boolean {
  return normalizeRole(role) === "superadmin";
}

export function hasRole(auth: any, rolesToMatch: string[]) {
  const role = normalizeRole(auth?.role);
  const normalizedMatches = rolesToMatch.map((r) => normalizeRole(r));
  return normalizedMatches.includes(role);
}

export async function getCurrentUser(auth: any) {
  if (!auth?.id) return null;
  return db.query.users.findFirst({
    where: eq(users.id, Number(auth.id)),
    with: { role: true },
    columns: {
      password: false,
      rememberToken: false,
    }
  });
}

/**
 * Why: Removes sensitive/internal fields before returning user payload.
 * When: Used in auth responses like register/login/me.
 * Where: Called by auth.controller handlers.
 */
export function sanitizeUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    status: user.status || "pending",
    adminId: user.adminId ?? null,
    approvedAt: user.approvedAt ? String(user.approvedAt) : null,
    subscriptionExpiresAt: user.subscriptionExpiresAt ? String(user.subscriptionExpiresAt) : null,
    emailVerifiedAt: user.emailVerifiedAt ? String(user.emailVerifiedAt) : null,
    roleId: user.roleId ?? null,
    role: user.role || null,
    createdAt: user.createdAt ? String(user.createdAt) : null,
    updatedAt: user.updatedAt ? String(user.updatedAt) : null
  };
}

/**
 * Why: Creates a cryptographically secure password reset token.
 * When: Used during forgot-password flow before hashing/storing.
 * Where: Called by forgotPassword handler.
 */
export function makeResetToken() {
  return randomBytes(32).toString("hex");
}

export function makeEmailVerificationToken() {
  return randomBytes(32).toString("hex");
}

/**
 * Why: Hashes reset token so plain token is never stored in DB.
 * When: Used for insert and verification in reset flow.
 * Where: Called by forgotPassword/resetPassword handlers.
 */
export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Why: Revokes currently active refresh token from cookie context.
 * When: Used before issuing new tokens or during logout.
 * Where: Called by register/login/logout flows.
 */
export async function revokeCurrentRefreshToken(c: any) {
  const token = await cookie.getRefresh(c);
  if (!token) return;

  const payload = await jwt.verifyToken(token, "refresh");
  if (payload?.jti) {
    await db.delete(refreshTokens).where(eq(refreshTokens.jti, payload.jti as string));
  }
}

/**
 * Why: Issues access+refresh tokens, persists refresh token, sets cookies.
 * When: Used after successful auth actions (register/login/refresh patterns).
 * Where: Called by auth.controller handlers.
 */
export async function issueTokens(c: any, user: any, options?: { remember?: boolean; }) {
  const remember = !!options?.remember;
  const refreshExpiry = remember ? jwtConfig.refreshRememberExpirySeconds : jwtConfig.refreshExpirySeconds;
  const role = user.role || null;
  const accessToken = await jwt.generateToken(
    {
      id: user.id,
      email: user.email,
      roleId: role?.id ?? null,
      role: role?.name ?? null,
      remember
    },
    "access"
  );
  const refreshToken = await jwt.generateToken(
    {
      id: user.id,
      email: user.email,
      roleId: role?.id ?? null,
      role: role?.name ?? null,
      remember
    },
    "refresh",
    refreshExpiry
  );

  if (refreshToken.jti) {
    await db.insert(refreshTokens).values({
      userId: user.id,
      jti: refreshToken.jti,
      revoked: false,
      expiresAt: new Date(refreshToken.exp * 1000)
    });
  }

  await cookie.setAuth(c, accessToken.token);
  await cookie.setRefresh(c, refreshToken.token, refreshExpiry);

  return { accessToken: accessToken.token, refreshToken: refreshToken.token };
}

/**
 * Why: Enforces account active status for logins, token refresh, and authMiddleware.
 *       Blocks inactive/rejected/pending users and checks parent admin status for staff.
 *       Notice: Expired subscription does NOT block login (admin must be able to log in to pay).
 */
export async function assertAccountActive(user: any): Promise<{ allowed: boolean; message?: string; code?: string }> {
  if (!user) {
    return { allowed: false, message: "User not found", code: "USER_NOT_FOUND" };
  }

  const roleName = String(user.role?.name || "").toLowerCase().replace(/_/g, "");

  // SuperAdmin is always allowed
  if (roleName === "superadmin") {
    return { allowed: true };
  }

  // Email verification check (if required by config)
  if (authConfig.requireEmailVerification && !user.emailVerifiedAt) {
    return {
      allowed: false,
      message: "Please verify your email before accessing your account.",
      code: "EMAIL_NOT_VERIFIED"
    };
  }

  // ALLOW-LIST ENFORCEMENT: Non-superadmins MUST have status === "active"
  if (user.status !== "active") {
    if (user.status === "pending") {
      return {
        allowed: false,
        message: "Your office account is pending approval.",
        code: "ACCOUNT_PENDING"
      };
    }

    if (user.status === "rejected") {
      return {
        allowed: false,
        message: roleName === "user"
          ? "Your staff account has been deactivated. Please contact your office administrator."
          : "Your office account has been rejected. Please contact Platform Support.",
        code: "ACCOUNT_REJECTED"
      };
    }

    // Default for inactive, suspended, or any unexpected status
    return {
      allowed: false,
      message: roleName === "user"
        ? "Your staff account is currently inactive. Please contact your office administrator."
        : "Your office account has been deactivated. Please contact Platform Support.",
      code: "ACCOUNT_INACTIVE"
    };
  }

  // If user is staff (role === 'user'), verify that the parent office admin is active!
  if (roleName === "user" && user.adminId) {
    const parentAdmin = await db.query.users.findFirst({
      where: eq(users.id, user.adminId)
    });

    if (!parentAdmin || parentAdmin.status !== "active") {
      return {
        allowed: false,
        message: "Your office account is currently inactive. Please contact your office administrator.",
        code: "OFFICE_INACTIVE"
      };
    }
  }

  return { allowed: true };
}

/**
 * Why: Revokes all active refresh tokens for an office admin and all their staff members,
 *       and forcibly terminates their open WebSocket connections.
 * When: SuperAdmin suspends, deactivates, or rejects an office.
 */
export async function revokeOfficeSessions(adminId: number) {
  const staff = await db.query.users.findMany({
    where: eq(users.adminId, adminId),
    columns: { id: true }
  });

  const allUserIds = [adminId, ...staff.map((s) => s.id)];

  await db.update(refreshTokens).set({ revoked: true }).where(inArray(refreshTokens.userId, allUserIds));

  for (const id of allUserIds) {
    try {
      disconnectUserSockets(id);
    } catch (e) {
      console.error(`Failed to disconnect socket for user ${id}:`, e);
    }
  }
}

