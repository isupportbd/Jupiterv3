// config/security.ts
import { env } from "@/env.js";

const isProd = env.APP_ENV === "production";

/**
 * Dev CSP is intentionally lax so HMR / inline bootstrap scripts work.
 * Prod CSP allows worker and blob scripts for background CSV/Excel ingestion.
 */
const csp = isProd
  ? [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.jsdelivr.net",
      "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.scalar.com",
      "connect-src 'self' blob: ws: wss: https://cdn.jsdelivr.net https://api.scalar.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join("; ")
  : [
      "default-src 'self'",
      "script-src 'self' blob: 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "worker-src 'self' blob:",
      "child-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https://cdn.jsdelivr.net",
      "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.scalar.com",
      "connect-src 'self' blob: ws: wss: https://cdn.jsdelivr.net https://api.scalar.com",
      "frame-ancestors 'none'"
    ].join("; ");

export const securityConfig = {
  enabled: env.SECURITY_HEADERS,
  csp,
  hsts: env.APP_ENV === "production",
  hstsMaxAge: "max-age=31536000; includeSubDomains",
  xFrame: "DENY"
};

export type SecurityConfig = typeof securityConfig;
