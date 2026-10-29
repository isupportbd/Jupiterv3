import { z } from "@/framework/facade.js";

export const MessageSchema = z.object({
  message: z.string()
});

export const RoleSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.email(),
  phone: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  adminId: z.number().nullable().optional(),
  roleId: z.number().nullable().optional(),
  role: RoleSchema.nullable().optional(),
  approvedAt: z.string().nullable().optional(),
  subscriptionExpiresAt: z.string().nullable().optional(),
  emailVerifiedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional()
});

export const RegisterSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.email(),
    phone: z.string().optional(),
    password: z
      .string()
      .min(6)
      .max(100)
      .regex(/[a-z]/, "Password must contain lowercase letter")
      .regex(/[A-Z]/, "Password must contain uppercase letter")
      .regex(/[^A-Za-z0-9]/, "Password must contain special character"),
    password_confirmation: z.string()
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: "custom",
        path: ["password_confirmation"],
        message: "Password confirmation does not match"
      });
    }
  });

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false)
});

export const ForgotPasswordSchema = z.object({
  email: z.email()
});

export const ResetPasswordSchema = z
  .object({
    email: z.email(),
    token: z.string().min(1),
    password: z
      .string()
      .min(6)
      .max(100)
      .regex(/[a-z]/, "Password must contain lowercase letter")
      .regex(/[A-Z]/, "Password must contain uppercase letter")
      .regex(/[^A-Za-z0-9]/, "Password must contain special character"),
    password_confirmation: z.string()
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.password_confirmation) {
      ctx.addIssue({
        code: "custom",
        path: ["password_confirmation"],
        message: "Password confirmation does not match"
      });
    }
  });

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1)
});

export const VerifyEmailSchema = z.object({
  email: z.email(),
  token: z.string().min(1)
});

export const AuthResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    user: UserSchema,
    access_token: z.string(),
    refresh_token: z.string(),
    token_type: z.literal("Bearer")
  })
});

export const IdParamsSchema = z.object({
  id: z.coerce.number()
});

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().nullable().optional()
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters").max(100),
    confirmPassword: z.string().min(6, "Confirm password is required")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirm password do not match",
    path: ["confirmPassword"]
  });

export const VerifyLoginOtpSchema = z.object({
  email: z.email(),
  otp: z.string().min(4).max(10),
  remember: z.boolean().optional().default(false)
});

export const ResendLoginOtpSchema = z.object({
  email: z.email()
});

