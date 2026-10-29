import { mail, shouldQueue } from "@/framework/facade.js";

/**
 * Why: Delivers login OTP code via email.
 * When: User initiates login when LOGIN_OTP_ENABLED is true.
 * Where: src/modules/auth/jobs/login-otp.ts.
 */
shouldQueue("user:login-otp", "mail", async (job) => {
  const { email, name, otp } = job.data;

  await mail.sendMail({
    to: email,
    subject: `Your Login Verification Code: ${otp}`,
    html: `
      <div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b; margin-top: 0;">Jupiter V3 - Security Verification</h2>
        <p style="color: #475569; font-size: 15px;">Hello ${name || "User"},</p>
        <p style="color: #475569; font-size: 15px;">A login request was made for your account. Please use the following One-Time Password (OTP) to complete your sign-in:</p>
        <div style="background: #f1f5f9; border-radius: 6px; padding: 18px 24px; margin: 24px 0; text-align: center;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0284c7; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This code will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">If you did not initiate this login request, please disregard this email or update your password immediately.</p>
      </div>
    `
  });

  return { ok: true, email };
});
