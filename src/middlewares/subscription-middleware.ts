import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { db, HttpStatusCodes } from "@/framework/facade.js";
import { users } from "@/modules/auth/database/models/user.js";

/**
 * Why: Enforces subscription validity for Office Admins and inherits validity for Office Staff.
 * When: Guards access to LC data ingestion and reports.
 * Where: Mounted on /api/bond/* and reporting routes.
 */
export async function subscriptionMiddleware(c: Context, next: Next) {
  const auth = c.get("auth");

  if (!auth) {
    return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const role = String(auth.role || "").toLowerCase();

  // SuperAdmin always bypasses subscription checks
  if (role === "super_admin" || role === "superadmin") {
    return await next();
  }

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, Number(auth.id))
  });

  if (!currentUser) {
    return c.json({ message: "User account not found" }, HttpStatusCodes.NOT_FOUND);
  }

  const now = new Date();

  // 1. Office Admin check
  if (role === "admin") {
    if (!currentUser.subscriptionExpiresAt || new Date(currentUser.subscriptionExpiresAt) < now) {
      return c.json(
        {
          message: "Your office subscription has expired. Please submit payment to renew.",
          code: "SUBSCRIPTION_EXPIRED",
          subscriptionExpiresAt: currentUser.subscriptionExpiresAt
        },
        HttpStatusCodes.PAYMENT_REQUIRED
      );
    }
    return await next();
  }

  // 2. Staff (user) check: inherit from parent Office Admin
  if (role === "user") {
    if (!currentUser.adminId) {
      return c.json(
        {
          message: "Your staff account is not linked to an active office administration.",
          code: "NO_PARENT_ADMIN"
        },
        HttpStatusCodes.FORBIDDEN
      );
    }

    const parentAdmin = await db.query.users.findFirst({
      where: eq(users.id, currentUser.adminId)
    });

    if (!parentAdmin || !parentAdmin.subscriptionExpiresAt || new Date(parentAdmin.subscriptionExpiresAt) < now) {
      return c.json(
        {
          message: "Your office subscription has expired. Please notify your office administrator to renew access.",
          code: "PARENT_SUBSCRIPTION_EXPIRED",
          subscriptionExpiresAt: parentAdmin?.subscriptionExpiresAt || null
        },
        HttpStatusCodes.PAYMENT_REQUIRED
      );
    }

    return await next();
  }

  return await next();
}

