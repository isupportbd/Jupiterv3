import { env } from "@/env.js";

/**
 * Why: SMTP mail transport settings.
 * When: Transactional mail (signup, reset, verify) is sent.
 * Where: src/config/mail.ts.
 * How: Reads host, port, encryption, and fromAddress dynamically from env
 *      with sensible fallbacks for local MailDev testing.
 */
export const mailConfig = {
  host: process.env.MAIL_HOST || "127.0.0.1",
  port: Number(process.env.MAIL_PORT) || 1089,
  encryption: (process.env.MAIL_ENCRYPTION || "none") as "none" | "ssl" | "tls",
  username: env.MAIL_USERNAME,
  password: env.MAIL_PASSWORD,
  fromName: process.env.MAIL_FROM_NAME || "Jupiter",
  fromAddress: process.env.MAIL_FROM_NAME
    ? `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS || env.MAIL_USERNAME || "no-reply@example.com"}>`
    : (process.env.MAIL_FROM_ADDRESS || env.MAIL_USERNAME || "no-reply@example.com"),
  failSilent: process.env.MAIL_FAIL_SILENT !== "false",
  maildev: {
    smtpPort: 1089,
    webPort: 1080
  }
};

export type MailConfig = typeof mailConfig;
