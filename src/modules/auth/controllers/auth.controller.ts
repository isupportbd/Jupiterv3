import { randomInt } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import type { Handler } from "hono";
import { authConfig, jwtConfig } from "@/config/index.js";
import { cookie, db, dispatchEvent, HttpStatusCodes, jwt, password, urls } from "@/framework/facade.js";
import { roles } from "@/modules/auth/database/models/role.js";
import { emailVerificationTokens, loginOtpTokens, passwordResetTokens, refreshTokens, users } from "@/modules/auth/database/models/user.js";
import {
  assertAccountActive,
  hashEmailVerificationToken,
  hashResetToken,
  issueTokens,
  makeEmailVerificationToken,
  makeResetToken,
  revokeCurrentRefreshToken,
  sanitizeUser
} from "./auth.helpers.js";

/**
 * Why: Creates a new user, issues tokens, and triggers signup side effects.
 * When: Used on first-time account creation.
 * Where: POST auth register route.
 */
export const register: Handler = async (c: any) => {
  try {
    const body = c.req.valid("json");
    const email = body.email.trim().toLowerCase();
    const adminRole = await db.query.roles.findFirst({
      where: eq(roles.name, "admin")
    });
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (existingUser) {
      return c.json({ message: "Email already exists" }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
    }

    const insertedRows = await db
      .insert(users)
      .values({
        name: body.name.trim(),
        email,
        phone: body.phone ? body.phone.trim() : null,
        status: "pending",
        password: await password.hashPassword(body.password),
        roleId: adminRole?.id ?? null
      })
      .returning();

    const user = insertedRows[0];
    if (!user) {
      return c.json({ message: "Failed to register user" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    return c.json(
      {
        message: "Office registration successful. You can log in once approved by SuperAdmin.",
        data: {
          user: sanitizeUser(user)
        }
      },
      HttpStatusCodes.CREATED
    );
  } catch (error) {
    console.error("Register error:", error);
    return c.json({ message: "Failed to register user" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Authenticates user credentials and rotates active login cookies/tokens.
 * When: Used whenever a user signs in.
 * Where: POST auth login route.
 */
export const login: Handler = async (c: any) => {
  try {
    const body = c.req.valid("json");
    const email = body.email.trim().toLowerCase();
    const user = await db.query.users.findFirst({ where: eq(users.email, email), with: { role: true } });

    if (!user || !(await password.verifyPassword(body.password, user.password))) {
      return c.json({ message: "Invalid credentials" }, HttpStatusCodes.UNAUTHORIZED);
    }

    const activeCheck = await assertAccountActive(user);
    if (!activeCheck.allowed) {
      return c.json({ message: activeCheck.message, code: activeCheck.code }, HttpStatusCodes.FORBIDDEN);
    }

    // Dynamic OTP check from .env (LOGIN_OTP_ENABLED)
    if (authConfig.loginOtpEnabled) {
      const otpCode = String(randomInt(100000, 1000000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.delete(loginOtpTokens).where(eq(loginOtpTokens.email, user.email));
      await db.insert(loginOtpTokens).values({
        email: user.email,
        otp: otpCode,
        expiresAt,
        createdAt: new Date()
      });

      await dispatchEvent(
        "user:login-otp",
        { email: user.email, name: user.name, otp: otpCode },
        { queue: "mail" }
      );

      return c.json(
        {
          message: "OTP verification code sent to your email",
          require_otp: true,
          email: user.email
        },
        HttpStatusCodes.OK
      );
    }

    await revokeCurrentRefreshToken(c);
    const tokens = await issueTokens(c, user, { remember: !!body.remember });

    return c.json(
      {
        message: "User logged in successfully",
        data: {
          user: sanitizeUser(user),
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_type: "Bearer"
        }
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ message: "Failed to login" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Verifies 6-digit login OTP and issues tokens upon success.
 * When: Used when authConfig.loginOtpEnabled is true and user submits OTP.
 * Where: POST auth verify-login-otp route.
 */
export const verifyLoginOtp: Handler = async (c: any) => {
  try {
    const body = c.req.valid("json");
    const email = body.email.trim().toLowerCase();
    const record = await db.query.loginOtpTokens.findFirst({
      where: and(
        eq(loginOtpTokens.email, email),
        eq(loginOtpTokens.otp, String(body.otp).trim()),
        gt(loginOtpTokens.expiresAt, new Date())
      )
    });

    if (!record) {
      return c.json({ message: "Invalid or expired OTP verification code" }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
    }

    await db.delete(loginOtpTokens).where(eq(loginOtpTokens.email, email));

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: { role: true }
    });

    if (!user) {
      return c.json({ message: "User not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const activeCheck = await assertAccountActive(user);
    if (!activeCheck.allowed) {
      return c.json({ message: activeCheck.message, code: activeCheck.code }, HttpStatusCodes.FORBIDDEN);
    }

    await revokeCurrentRefreshToken(c);
    const tokens = await issueTokens(c, user, { remember: !!body.remember });

    return c.json(
      {
        message: "OTP verified successfully. Logged in.",
        data: {
          user: sanitizeUser(user),
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          token_type: "Bearer"
        }
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Verify Login OTP error:", error);
    return c.json({ message: "Failed to verify OTP" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Resends new 6-digit login OTP code to user's email.
 * When: User clicks 'Resend OTP' during login.
 * Where: POST auth resend-login-otp route.
 */
export const resendLoginOtp: Handler = async (c: any) => {
  try {
    const body = c.req.valid("json");
    const email = body.email.trim().toLowerCase();
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      return c.json({ message: "If that email exists, an OTP code has been sent." }, HttpStatusCodes.OK);
    }

    const otpCode = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.delete(loginOtpTokens).where(eq(loginOtpTokens.email, user.email));
    await db.insert(loginOtpTokens).values({
      email: user.email,
      otp: otpCode,
      expiresAt,
      createdAt: new Date()
    });

    await dispatchEvent(
      "user:login-otp",
      { email: user.email, name: user.name, otp: otpCode },
      { queue: "mail" }
    );

    return c.json({ message: "New OTP verification code sent to your email" }, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Resend Login OTP error:", error);
    return c.json({ message: "Failed to resend OTP" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Returns the currently authenticated user profile.
 * When: Used by clients to bootstrap session/user state.
 * Where: GET auth me route.
 */
export const me: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const user = await db.query.users.findFirst({
      where: eq(users.id, auth.id),
      with: { role: true }
    });

    if (!user) return c.json({ message: "User not found" }, HttpStatusCodes.NOT_FOUND);

    return c.json(
      {
        message: "Authenticated user fetched successfully",
        data: sanitizeUser(user)
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Me error:", error);
    return c.json({ message: "Failed to fetch user" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Revokes current refresh token and clears auth cookies.
 * When: Used when the active device logs out.
 * Where: POST auth logout route.
 */
export const logout: Handler = async (c: any) => {
  try {
    await revokeCurrentRefreshToken(c);
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Logged out successfully" }, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Logout error:", error);
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);
    return c.json({ message: "Failed to logout" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Starts password reset flow and queues email delivery event.
 * When: Used when user requests a forgot-password link.
 * Where: POST auth forgot-password route.
 */
export const forgotPassword: Handler = async (c: any) => {
  try {
    const body = c.req.valid("json");
    const email = body.email.trim().toLowerCase();
    await db
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.email, email), lt(passwordResetTokens.expiresAt, new Date())));

    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) return c.json({ message: "Reset link has been sent" }, HttpStatusCodes.OK);

    const plainToken = makeResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.email, user.email));
    await db.insert(passwordResetTokens).values({
      email: user.email,
      token: hashResetToken(plainToken),
      expiresAt,
      createdAt: new Date()
    });

    const resetUrl = urls.url(`/reset-password?token=${plainToken}&email=${encodeURIComponent(user.email)}`);
    await dispatchEvent("user:forget-password", { email: user.email, name: user.name, resetUrl }, { queue: "mail" });

    return c.json({ message: "Reset link passed" }, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Forgot password error:", error);
    return c.json({ message: "Failed to process forgot password request" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Verifies reset token and persists the new password.
 * When: Used after user submits reset token + new password.
 * Where: POST auth reset-password route.
 */
export const resetPassword: Handler = async (c: any) => {
  try {
    const body = c.req.valid("json");
    const email = body.email.trim().toLowerCase();
    const record = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.email, email),
        eq(passwordResetTokens.token, hashResetToken(body.token)),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    });

    if (!record) {
      return c.json({ message: "Invalid or expired reset token" }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
    }

    await db
      .update(users)
      .set({
        password: await password.hashPassword(body.password),
        updatedAt: new Date()
      })
      .where(eq(users.email, email));

    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.email, email));

    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    if (user) await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, user.id));

    return c.json({ message: "Password reset successfully" }, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Reset password error:", error);
    return c.json({ message: "Failed to reset password" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Validates email verification token and marks user as verified.
 * When: Used when user opens verification link from inbox.
 * Where: POST auth verify-email route.
 */
export const verifyEmail: Handler = async (c: any) => {
  try {
    const body = c.req.valid("json");
    const email = body.email.trim().toLowerCase();

    if (!authConfig.requireEmailVerification) {
      return c.json({ message: "Email verification is not required" }, HttpStatusCodes.OK);
    }

    const record = await db.query.emailVerificationTokens.findFirst({
      where: and(
        eq(emailVerificationTokens.email, email),
        eq(emailVerificationTokens.token, hashEmailVerificationToken(body.token)),
        gt(emailVerificationTokens.expiresAt, new Date())
      )
    });

    if (!record) {
      return c.json({ message: "Invalid or expired verification token" }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
    }

    await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.email, email));
    await db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.email, email));

    return c.json({ message: "Email verified successfully" }, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Verify email error:", error);
    return c.json({ message: "Failed to verify email" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Rotates refresh token and reissues access credentials.
 * When: Used when access token expires but refresh token is still valid.
 * Where: POST auth refresh-token route.
 */
export const refreshToken: Handler = async (c: any) => {
  try {
    const body = c.req.valid("json");
    const payload = await jwt.verifyToken(body.refresh_token, "refresh");

    if (!payload?.jti) return c.json({ message: "Invalid refresh token" }, HttpStatusCodes.UNAUTHORIZED);

    const storedToken = await db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.jti, payload.jti as string)
    });

    if (!storedToken || storedToken.revoked) {
      return c.json({ message: "Refresh token revoked" }, HttpStatusCodes.UNAUTHORIZED);
    }

    if (storedToken.expiresAt.getTime() < Date.now()) {
      await db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));
      return c.json({ message: "Refresh token expired" }, HttpStatusCodes.UNAUTHORIZED);
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.id as number),
      with: { role: true }
    });
    if (!user) return c.json({ message: "User not found" }, HttpStatusCodes.UNAUTHORIZED);

    const activeCheck = await assertAccountActive(user);
    if (!activeCheck.allowed) {
      await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, storedToken.id));
      cookie.deleteAuth(c);
      cookie.deleteRefresh(c);
      return c.json({ message: activeCheck.message, code: activeCheck.code }, HttpStatusCodes.FORBIDDEN);
    }

    const remember = !!payload.remember;
    const refreshExpiry = remember ? jwtConfig.refreshRememberExpirySeconds : undefined;
    const accessToken = await jwt.generateToken(
      {
        id: user.id,
        email: user.email,
        roleId: user.role?.id,
        role: user.role?.name,
        remember
      },
      "access"
    );
    const newRefreshToken = await jwt.generateToken(
      {
        id: user.id,
        email: user.email,
        roleId: user.role?.id,
        role: user.role?.name,
        remember
      },
      "refresh",
      refreshExpiry
    );

    await db
      .update(refreshTokens)
      .set({
        jti: newRefreshToken.jti as string,
        expiresAt: new Date(newRefreshToken.exp * 1000),
        revoked: false
      })
      .where(eq(refreshTokens.id, storedToken.id));

    await cookie.setAuth(c, accessToken.token);
    await cookie.setRefresh(c, newRefreshToken.token, refreshExpiry);

    return c.json(
      {
        message: "Token refreshed successfully",
        data: {
          user: sanitizeUser(user),
          access_token: accessToken.token,
          refresh_token: newRefreshToken.token,
          token_type: "Bearer"
        }
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Refresh token error:", error);
    return c.json({ message: "Invalid or expired refresh token" }, HttpStatusCodes.UNAUTHORIZED);
  }
};

/**
 * Why: Revokes all refresh tokens for account-wide logout.
 * When: Used for "logout from all devices" security action.
 * Where: POST auth logout-all-devices route.
 */
export const logoutAllDevices: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");

    if (!auth) return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);

    await db.delete(refreshTokens).where(eq(refreshTokens.userId, auth.id));
    cookie.deleteAuth(c);
    cookie.deleteRefresh(c);

    return c.json({ message: "Logged out from all devices successfully" }, HttpStatusCodes.OK);
  } catch (error) {
    console.error("Logout all devices error:", error);
    return c.json({ message: "Failed to logout from all devices" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Allows logged-in user to update their personal profile (name, phone).
 * When: Used on My Profile page.
 * Where: PUT /api/auth/profile
 */
export const updateProfile: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    if (!auth) return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);

    const body = c.req.valid("json");

    const updated = await db
      .update(users)
      .set({
        name: body.name,
        phone: body.phone ?? null,
        updatedAt: new Date()
      })
      .where(eq(users.id, Number(auth.id)))
      .returning();

    const user = updated[0];
    if (!user) {
      return c.json({ message: "User not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const fullUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      with: { role: true }
    });

    return c.json(
      {
        message: "Profile updated successfully",
        data: sanitizeUser(fullUser || user)
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Update profile error:", error);
    return c.json({ message: "Failed to update profile" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Allows logged-in user to change their account password securely.
 * When: Used on My Profile security settings.
 * Where: POST /api/auth/change-password
 */
export const changePassword: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    if (!auth) return c.json({ message: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED);

    const body = c.req.valid("json");

    const user = await db.query.users.findFirst({
      where: eq(users.id, Number(auth.id))
    });

    if (!user) {
      return c.json({ message: "User not found" }, HttpStatusCodes.NOT_FOUND);
    }

    const isMatch = await password.verifyPassword(body.currentPassword, user.password);
    if (!isMatch) {
      return c.json({ message: "Current password does not match" }, HttpStatusCodes.UNPROCESSABLE_ENTITY);
    }

    const hashedPassword = await password.hashPassword(body.newPassword);
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    return c.json(
      {
        message: "Password changed successfully"
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Change password error:", error);
    return c.json({ message: "Failed to change password" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

