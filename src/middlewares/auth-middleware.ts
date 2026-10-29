import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { cookie, db, jwt, HttpStatusCodes } from "@/framework/facade.js";
import { assertAccountActive } from "@/modules/auth/controllers/auth.helpers.js";
import { refreshTokens, users } from "@/modules/auth/database/models/user.js";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const accessToken = (await cookie.getAuth(c)) || bearerToken;

  if (accessToken) {
    const accessPayload = await jwt.verifyToken(accessToken, "access");

    if (accessPayload) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, accessPayload.id as number),
        with: { role: true }
      });

      if (!user) {
        cookie.deleteAuth(c);
        cookie.deleteRefresh(c);
        return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
      }

      const activeCheck = await assertAccountActive(user);
      if (!activeCheck.allowed) {
        await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, user.id));
        cookie.deleteAuth(c);
        cookie.deleteRefresh(c);
        return c.json({ message: activeCheck.message, code: activeCheck.code }, HttpStatusCodes.FORBIDDEN);
      }

      c.set("auth", {
        ...accessPayload,
        id: user.id,
        email: user.email,
        roleId: user.role?.id ?? null,
        role: user.role?.name ?? null
      });
      return await next();
    }
  }

  const refreshToken = await cookie.getRefresh(c);

  if (!refreshToken) {
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const refreshPayload = await jwt.verifyToken(refreshToken, "refresh");

  if (!refreshPayload?.jti) {
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Invalid token" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const storedToken = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.jti, refreshPayload.jti as string)
  });

  if (!storedToken || storedToken.revoked) {
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Invalid token" }, HttpStatusCodes.UNAUTHORIZED);
  }

  if (storedToken.expiresAt.getTime() < Date.now()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Invalid token" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, refreshPayload.id as number),
    with: { role: true }
  });

  if (!user) {
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);
  }

  const activeCheck = await assertAccountActive(user);
  if (!activeCheck.allowed) {
    await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, user.id));
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: activeCheck.message, code: activeCheck.code }, HttpStatusCodes.FORBIDDEN);
  }

  const newAccessToken = await jwt.generateToken(
    {
      id: user.id,
      email: user.email,
      roleId: user.role?.id ?? null,
      role: user.role?.name ?? null
    },
    "access"
  );

  await cookie.setAuth(c, newAccessToken.token);
  c.set("auth", {
    id: user.id,
    email: user.email,
    roleId: user.role?.id ?? null,
    role: user.role?.name ?? null,
    type: "access"
  });
  return await next();
}
