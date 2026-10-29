import { and, desc, eq, sql } from "drizzle-orm";
import type { Handler } from "hono";
import { db, disconnectUserSockets, HttpStatusCodes, paginate, password } from "@/framework/facade.js";
import { roles } from "@/modules/auth/database/models/role.js";
import { refreshTokens, users } from "@/modules/auth/database/models/user.js";
import { isSuperAdmin, revokeOfficeSessions, sanitizeUser } from "./auth.helpers.js";

/**
 * Why: Lists registered offices/admins for SuperAdmin review.
 * When: SuperAdmin views office approvals page (/users).
 * Where: GET /api/auth/admin/users
 */
export const listOffices: Handler = async (c: any) => {
  try {
    const status = c.req.query("status"); // 'all' | 'pending' | 'active' | 'rejected'
    const search = c.req.query("search")?.trim();

    const adminRole = await db.query.roles.findFirst({
      where: eq(roles.name, "admin")
    });

    if (!adminRole) {
      return c.json({ data: [], meta: { page: 1, limit: 10, total: 0 } }, HttpStatusCodes.OK);
    }

    const conditions: any[] = [eq(users.roleId, adminRole.id)];
    if (status && status !== "all") {
      conditions.push(eq(users.status, status));
    }
    if (search) {
      const term = `%${search}%`;
      conditions.push(
        sql`(${users.name} ILIKE ${term} OR ${users.email} ILIKE ${term} OR ${users.phone} ILIKE ${term})`
      );
    }

    const query = db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        status: users.status,
        roleId: users.roleId,
        approvedAt: users.approvedAt,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
        createdAt: users.createdAt
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));

    const result = await paginate(c, query);

    return c.json(
      {
        message: "Office accounts fetched successfully",
        data: result.data.map(sanitizeUser),
        meta: {
          total: result.total,
          currentPage: result.current_page,
          lastPage: result.last_page,
          perPage: result.per_page
        }
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("List offices error:", error);
    return c.json({ message: "Failed to fetch office accounts" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Toggles office status between active and inactive.
 * When: SuperAdmin switches the status toggle in /users table.
 * Where: POST /api/auth/admin/users/:id/status
 */
export const updateOfficeStatus: Handler = async (c: any) => {
  try {
    const id = Number(c.req.param("id"));
    const body = await c.req.json().catch(() => ({}));
    const newStatus = body.status === "active" ? "active" : "inactive";

    const target = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: { role: true }
    });

    if (!target) {
      return c.json({ message: "Office account not found" }, HttpStatusCodes.NOT_FOUND);
    }

    if (isSuperAdmin(target.role?.name)) {
      return c.json({ message: "Cannot modify Super Admin" }, HttpStatusCodes.FORBIDDEN);
    }

    const [updated] = await db
      .update(users)
      .set({
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    if (newStatus !== "active") {
      await revokeOfficeSessions(id);
    }

    return c.json(
      {
        message: `Office account is now ${newStatus}.`,
        data: sanitizeUser(updated)
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Update office status error:", error);
    return c.json({ message: "Failed to update office status" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Approves a pending office admin.
 * When: SuperAdmin clicks Approve on /users.
 * Where: POST /api/auth/admin/users/:id/approve
 */
export const approveOffice: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const id = Number(c.req.param("id"));

    const target = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: { role: true }
    });

    if (!target) {
      return c.json({ message: "Office account not found" }, HttpStatusCodes.NOT_FOUND);
    }

    if (isSuperAdmin(target.role?.name)) {
      return c.json({ message: "Cannot modify Super Admin" }, HttpStatusCodes.FORBIDDEN);
    }

    const defaultSubscription = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days initial validity

    const [updated] = await db
      .update(users)
      .set({
        status: "active",
        approvedAt: new Date(),
        approvedBy: auth.id,
        subscriptionExpiresAt: target.subscriptionExpiresAt && target.subscriptionExpiresAt > new Date()
          ? target.subscriptionExpiresAt
          : defaultSubscription,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    return c.json(
      {
        message: "Office account approved successfully.",
        data: sanitizeUser(updated)
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Approve office error:", error);
    return c.json({ message: "Failed to approve office" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Rejects or suspends an office admin.
 * When: SuperAdmin clicks Reject on /users.
 * Where: POST /api/auth/admin/users/:id/reject
 */
export const rejectOffice: Handler = async (c: any) => {
  try {
    const id = Number(c.req.param("id"));

    const target = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: { role: true }
    });

    if (!target) {
      return c.json({ message: "Office account not found" }, HttpStatusCodes.NOT_FOUND);
    }

    if (isSuperAdmin(target.role?.name)) {
      return c.json({ message: "Cannot modify Super Admin" }, HttpStatusCodes.FORBIDDEN);
    }

    const [updated] = await db
      .update(users)
      .set({
        status: "rejected",
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    await revokeOfficeSessions(id);

    return c.json(
      {
        message: "Office account rejected successfully.",
        data: sanitizeUser(updated)
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Reject office error:", error);
    return c.json({ message: "Failed to reject office" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Manually extends an office admin's subscription.
 * When: SuperAdmin adds validity days.
 * Where: POST /api/auth/admin/users/:id/subscription
 */
export const extendSubscription: Handler = async (c: any) => {
  try {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const daysToAdd = Math.max(1, Number(body.days || 30));

    const target = await db.query.users.findFirst({
      where: eq(users.id, id)
    });

    if (!target) {
      return c.json({ message: "Office account not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const baseDate = target.subscriptionExpiresAt && target.subscriptionExpiresAt > new Date()
      ? new Date(target.subscriptionExpiresAt)
      : new Date();

    const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const [updated] = await db
      .update(users)
      .set({
        subscriptionExpiresAt: newExpiry,
        status: "active",
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    return c.json(
      {
        message: `Subscription extended by ${daysToAdd} days.`,
        data: sanitizeUser(updated)
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Extend subscription error:", error);
    return c.json({ message: "Failed to extend subscription" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Lists staff accounts created by the authenticated Office Admin.
 * When: Office Admin visits the staff delegation / management view.
 * Where: GET /api/auth/staff
 */
export const listStaff: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");

    const staffMembers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        status: users.status,
        roleId: users.roleId,
        adminId: users.adminId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.adminId, auth.id))
      .orderBy(desc(users.createdAt));

    return c.json(
      {
        message: "Staff accounts fetched successfully",
        data: staffMembers.map(sanitizeUser)
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("List staff error:", error);
    return c.json({ message: "Failed to fetch staff accounts" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Allows an Office Admin to create a staff account under their office (maximum 10).
 * When: Office Admin adds an office staff.
 * Where: POST /api/auth/staff
 */
export const createStaff: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const body = await c.req.json();

    if (!body.name || !body.email || !body.password) {
      return c.json({ message: "Name, email, and password are required" }, HttpStatusCodes.BAD_REQUEST);
    }

    if (body.password.length < 6) {
      return c.json({ message: "Password must be at least 6 characters" }, HttpStatusCodes.BAD_REQUEST);
    }

    // Limit check: Maximum 10 staff accounts per office
    const existingStaff = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.adminId, auth.id));

    if (existingStaff.length >= 10) {
      return c.json(
        { message: "Staff limit reached (maximum 10 staff accounts per office allowed)." },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Check unique email
    const emailExists = await db.query.users.findFirst({
      where: eq(users.email, body.email.trim().toLowerCase())
    });

    if (emailExists) {
      return c.json({ message: "A user with this email address already exists" }, HttpStatusCodes.CONFLICT);
    }

    // Get 'user' role
    const userRole = await db.query.roles.findFirst({
      where: eq(roles.name, "user")
    });

    if (!userRole) {
      return c.json({ message: "User role not configured" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    const hashedPassword = await password.hashPassword(body.password);

    const [newStaff] = await db
      .insert(users)
      .values({
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone?.trim() || null,
        password: hashedPassword,
        roleId: userRole.id,
        adminId: auth.id,
        status: "active",
        emailVerifiedAt: new Date()
      })
      .returning();

    return c.json(
      {
        message: "Staff account created successfully.",
        data: sanitizeUser(newStaff)
      },
      HttpStatusCodes.CREATED
    );
  } catch (error) {
    console.error("Create staff error:", error);
    return c.json({ message: "Failed to create staff account" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Allows an Office Admin to reset a staff member's password.
 * When: Staff forgets password or admin updates credentials.
 * Where: POST /api/auth/staff/:id/password-reset
 */
export const resetStaffPassword: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const id = Number(c.req.param("id"));
    const body = await c.req.json();

    if (!body.password || body.password.length < 6) {
      return c.json({ message: "Password must be at least 6 characters" }, HttpStatusCodes.BAD_REQUEST);
    }

    const targetStaff = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.adminId, auth.id))
    });

    if (!targetStaff) {
      return c.json({ message: "Staff account not found in your office" }, HttpStatusCodes.NOT_FOUND);
    }

    const hashedPassword = await password.hashPassword(body.password);

    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));

    return c.json({ message: "Staff password reset successfully." }, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Reset staff password error:", error);
    return c.json({ message: "Failed to reset staff password" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Allows an Office Admin to toggle staff status (active / rejected).
 * When: Staff leaves office or access is temporarily paused.
 * Where: POST /api/auth/staff/:id/status
 */
export const updateStaffStatus: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const id = Number(c.req.param("id"));
    const body = await c.req.json();

    if (!["active", "rejected"].includes(body.status)) {
      return c.json({ message: "Invalid status. Must be active or rejected." }, HttpStatusCodes.BAD_REQUEST);
    }

    const targetStaff = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.adminId, auth.id))
    });

    if (!targetStaff) {
      return c.json({ message: "Staff account not found in your office" }, HttpStatusCodes.NOT_FOUND);
    }

    const [updated] = await db
      .update(users)
      .set({
        status: body.status,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();

    if (body.status !== "active") {
      await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, id));
      disconnectUserSockets(id);
    }

    return c.json(
      {
        message: `Staff status updated to ${body.status}.`,
        data: sanitizeUser(updated)
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Update staff status error:", error);
    return c.json({ message: "Failed to update staff status" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Single Admin Transfer Engine.
 *       Allows the current Office Admin to transfer Admin ownership to one of their staff members.
 *       Atomically:
 *       1. Promotes designated staff member to 'admin' (adminId = null, inherits subscription).
 *       2. Demotes current Office Admin to 'user' (adminId = newAdmin.id).
 *       3. Reassigns all other staff members of this office to point to the new Admin.
 *       4. Strictly blocks any assignment of superadmin.
 * When: Office Admin steps down or hands over ownership.
 * Where: POST /api/auth/staff/:id/transfer-admin
 */
export const transferOfficeAdmin: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const targetStaffId = Number(c.req.param("id"));

    // Verify caller is active admin
    const currentAdmin = await db.query.users.findFirst({
      where: eq(users.id, auth.id),
      with: { role: true }
    });

    if (!currentAdmin || currentAdmin.role?.name !== "admin") {
      return c.json({ message: "Only an active Office Admin can transfer administration" }, HttpStatusCodes.FORBIDDEN);
    }

    // Verify target staff belongs to caller
    const targetStaff = await db.query.users.findFirst({
      where: and(eq(users.id, targetStaffId), eq(users.adminId, auth.id)),
      with: { role: true }
    });

    if (!targetStaff) {
      return c.json({ message: "Target staff member not found in your office" }, HttpStatusCodes.NOT_FOUND);
    }

    const targetRoleName = String(targetStaff.role?.name || "").toLowerCase().replace(/_/g, "");
    if (targetRoleName === "admin" || targetRoleName === "superadmin") {
      return c.json({ message: "Cannot transfer administration to another admin" }, HttpStatusCodes.FORBIDDEN);
    }

    // Role definitions
    const adminRole = await db.query.roles.findFirst({ where: eq(roles.name, "admin") });
    const userRole = await db.query.roles.findFirst({ where: eq(roles.name, "user") });
    const superAdminRole = await db.query.roles.findFirst({
      where: sql`${roles.name} IN ('superadmin', 'super_admin')`
    });

    if (!adminRole || !userRole) {
      return c.json({ message: "System roles not properly configured" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    // Safeguard: Ensure no accidental superadmin escalation
    if (superAdminRole && (adminRole.id === superAdminRole.id || userRole.id === superAdminRole.id)) {
      return c.json({ message: "Security violation: Invalid role mapping" }, HttpStatusCodes.FORBIDDEN);
    }

    // Atomic Database Transaction
    await db.transaction(async (tx) => {
      // Re-verify inside transaction to eliminate race conditions
      const freshTarget = await tx.query.users.findFirst({
        where: and(eq(users.id, targetStaffId), eq(users.adminId, currentAdmin.id))
      });

      if (!freshTarget) {
        throw new Error("TARGET_STAFF_NOT_FOUND");
      }

      // 1. Promote target staff to admin
      await tx
        .update(users)
        .set({
          roleId: adminRole.id,
          adminId: null,
          subscriptionExpiresAt: currentAdmin.subscriptionExpiresAt,
          updatedAt: new Date()
        })
        .where(eq(users.id, targetStaffId));

      // 2. Demote current admin to user under the new admin
      await tx
        .update(users)
        .set({
          roleId: userRole.id,
          adminId: targetStaffId,
          subscriptionExpiresAt: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, currentAdmin.id));

      // 3. Reassign all remaining staff of this office to the new admin
      await tx
        .update(users)
        .set({
          adminId: targetStaffId,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(users.adminId, currentAdmin.id),
            sql`${users.id} != ${targetStaffId}`
          )
        );
    });

    // Invalidate sessions for both affected users to ensure fresh tokens with updated roles
    await revokeOfficeSessions(targetStaffId);
    await revokeOfficeSessions(currentAdmin.id);

    return c.json(
      {
        message: `Office administration successfully transferred to ${targetStaff.name}. You are now a staff user.`,
        data: {
          newAdminId: targetStaffId,
          formerAdminId: currentAdmin.id
        }
      },
      HttpStatusCodes.OK
    );
  } catch (error: any) {
    console.error("Transfer office admin error:", error);
    if (error?.message === "TARGET_STAFF_NOT_FOUND") {
      return c.json({ message: "Target staff is no longer available in this office" }, HttpStatusCodes.NOT_FOUND);
    }
    return c.json({ message: "Failed to transfer office administration" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

