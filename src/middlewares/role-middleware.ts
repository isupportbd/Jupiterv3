import type { Context, Next } from "hono";
import { HttpStatusCodes } from "@/framework/facade.js";

type AuthPayload = {
  role?: string | null;
};

export function requireRole(...allowedRoles: string[]) {
  const norm = (s: string) => String(s || "").toLowerCase().replace(/_/g, "");
  const roles = allowedRoles.map(norm);

  return async (c: Context, next: Next) => {
    const auth = c.get("auth") as AuthPayload | undefined;

    if (!auth) {
      return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
    }

    const userRole = norm(String(auth.role ?? ""));
    if (userRole === "superadmin" || roles.includes(userRole)) {
      return await next();
    }

    return c.json({ message: "Forbidden: Insufficient permissions" }, HttpStatusCodes.FORBIDDEN);
  };
}
