import { createRoute, createRouter, HttpStatusCodes, jsonContent, z } from "@/framework/facade.js";
import { loginLimiter } from "@/framework/http/ratelimiter.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";
import {
  forgotPassword,
  login,
  logout,
  logoutAllDevices,
  me,
  refreshToken,
  register,
  resendLoginOtp,
  resetPassword,
  updateProfile,
  changePassword,
  verifyEmail,
  verifyLoginOtp
} from "@/modules/auth/controllers/auth.controller.js";
import {
  AuthResponseSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  MessageSchema,
  RefreshTokenSchema,
  RegisterSchema,
  ResendLoginOtpSchema,
  ResetPasswordSchema,
  UpdateProfileSchema,
  UserSchema,
  VerifyEmailSchema,
  VerifyLoginOtpSchema
} from "@/modules/auth/controllers/auth.schema.js";

const registerRoute = createRoute({
  path: "/register",
  method: "post",
  tags: ["Auth"],
  description: "Register a new user",
  request: {
    body: jsonContent(RegisterSchema, "Register payload")
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(AuthResponseSchema, "Registered")
  }
});

const loginRoute = createRoute({
  path: "/login",
  method: "post",
  tags: ["Auth"],
  description: "Login user",
  request: {
    body: jsonContent(LoginSchema, "Login payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.any(), "Logged in or OTP required")
  }
});

const verifyLoginOtpRoute = createRoute({
  path: "/verify-login-otp",
  method: "post",
  tags: ["Auth"],
  description: "Verify login OTP code",
  request: {
    body: jsonContent(VerifyLoginOtpSchema, "Verify login OTP payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(AuthResponseSchema, "OTP verified and logged in")
  }
});

const resendLoginOtpRoute = createRoute({
  path: "/resend-login-otp",
  method: "post",
  tags: ["Auth"],
  description: "Resend login OTP code",
  request: {
    body: jsonContent(ResendLoginOtpSchema, "Resend login OTP payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(MessageSchema, "OTP resent")
  }
});

const meRoute = createRoute({
  path: "/me",
  method: "get",
  tags: ["Auth"],
  description: "Get authenticated user",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.object({ message: z.string(), data: UserSchema }), "Authenticated user")
  }
});

const logoutRoute = createRoute({
  path: "/logout",
  method: "post",
  tags: ["Auth"],
  description: "Logout user from current device",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(MessageSchema, "Logged out")
  }
});

const logoutAllDevicesRoute = createRoute({
  path: "/logout-all",
  method: "post",
  tags: ["Auth"],
  description: "Logout user from all devices",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(MessageSchema, "Logged out from all devices")
  }
});

const forgotPasswordRoute = createRoute({
  path: "/forgot-password",
  method: "post",
  tags: ["Auth"],
  description: "Send reset password email",
  request: {
    body: jsonContent(ForgotPasswordSchema, "Forgot password payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(MessageSchema, "Reset email sent")
  }
});

const resetPasswordRoute = createRoute({
  path: "/reset-password",
  method: "post",
  tags: ["Auth"],
  description: "Reset password using token",
  request: {
    body: jsonContent(ResetPasswordSchema, "Reset password payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(MessageSchema, "Password reset")
  }
});

const refreshTokenRoute = createRoute({
  path: "/refresh-token",
  method: "post",
  tags: ["Auth"],
  description: "Refresh access token",
  request: {
    body: jsonContent(RefreshTokenSchema, "Refresh token payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(AuthResponseSchema, "Token refreshed")
  }
});

const verifyEmailRoute = createRoute({
  path: "/verify-email",
  method: "post",
  tags: ["Auth"],
  description: "Verify user email using token",
  request: {
    body: jsonContent(VerifyEmailSchema, "Verify email payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(MessageSchema, "Email verified")
  }
});

import {
  approveOffice,
  createStaff,
  extendSubscription,
  listOffices,
  listStaff,
  rejectOffice,
  resetStaffPassword,
  transferOfficeAdmin,
  updateOfficeStatus,
  updateStaffStatus
} from "@/modules/auth/controllers/admin-user.controller.js";
import { requireRole } from "@/middlewares/role-middleware.js";

const publicRoute = createRouter()
  .group(loginLimiter)
  .api(registerRoute, register)
  .api(loginRoute, login)
  .api(verifyLoginOtpRoute, verifyLoginOtp)
  .api(resendLoginOtpRoute, resendLoginOtp)
  .api(forgotPasswordRoute, forgotPassword)
  .api(resetPasswordRoute, resetPassword)
  .api(verifyEmailRoute, verifyEmail)
  .api(refreshTokenRoute, refreshToken);

const updateProfileRoute = createRoute({
  path: "/profile",
  method: "put",
  tags: ["Auth"],
  description: "Update user profile",
  request: {
    body: jsonContent(UpdateProfileSchema, "Profile payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(z.object({ message: z.string(), data: UserSchema }), "Profile updated")
  }
});

const changePasswordRoute = createRoute({
  path: "/change-password",
  method: "post",
  tags: ["Auth"],
  description: "Change user password",
  request: {
    body: jsonContent(ChangePasswordSchema, "Password payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(MessageSchema, "Password changed")
  }
});

const protectedRoute = createRouter()
  .group(authMiddleware)
  .api(meRoute, me)
  .api(updateProfileRoute, updateProfile)
  .api(changePasswordRoute, changePassword)
  .api(logoutRoute, logout)
  .api(logoutAllDevicesRoute, logoutAllDevices);

const officeAdminRoute = createRouter()
  .use("/staff*", authMiddleware, requireRole("admin", "super_admin"))
  .get("/staff", listStaff)
  .post("/staff", createStaff)
  .post("/staff/:id/password-reset", resetStaffPassword)
  .post("/staff/:id/status", updateStaffStatus)
  .post("/staff/:id/transfer-admin", transferOfficeAdmin);

const superAdminRoute = createRouter()
  .use("/admin/users*", authMiddleware, requireRole("super_admin"))
  .get("/admin/users", listOffices)
  .post("/admin/users/:id/status", updateOfficeStatus)
  .post("/admin/users/:id/approve", approveOffice)
  .post("/admin/users/:id/reject", rejectOffice)
  .post("/admin/users/:id/subscription", extendSubscription);

export default createRouter()
  .route("/", publicRoute)
  .route("/", protectedRoute)
  .route("/", officeAdminRoute)
  .route("/", superAdminRoute);

