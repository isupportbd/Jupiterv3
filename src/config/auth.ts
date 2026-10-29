import { env } from "@/env.js";

/**
 * Why: Account/authentication policy settings.
 * When: Register, login, and email verification flows.
 * Where: src/config/auth.ts.
 * How: Dynamic from env for OTP / 2FA. `loginOtpEnabled` requires an OTP step
 *      during login before issuing session tokens. Default is false.
 */
export const authConfig = {
  requireEmailVerification: false,
  loginOtpEnabled: Boolean(env.LOGIN_OTP_ENABLED)
};

export type AuthConfig = typeof authConfig;

