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
import {
  CreateStaffBodySchema,
  ExtendSubscriptionBodySchema,
  ListOfficesQuerySchema,
  ListOfficesResponseSchema,
  ListStaffResponseSchema,
  OfficeActionResponseSchema,
  ResetStaffPasswordBodySchema,
  StaffActionResponseSchema,
  UpdateOfficeStatusBodySchema,
  UpdateStaffStatusBodySchema,
  UserIdParamSchema
} from "../controllers/admin-user.schema.js";
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

const listStaffRoute = createRoute({
  path: "/staff",
  method: "get",
  tags: ["Staff Management"],
  description: "Lists staff accounts created by the authenticated Office Admin",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(ListStaffResponseSchema, "Staff accounts fetched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(MessageSchema, "Failed to fetch staff accounts")
  }
});

const createStaffRoute = createRoute({
  path: "/staff",
  method: "post",
  tags: ["Staff Management"],
  description: "Creates a staff account under the office",
  request: {
    body: jsonContent(CreateStaffBodySchema, "Create staff payload")
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(StaffActionResponseSchema, "Staff account created successfully"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(MessageSchema, "Validation or limit error"),
    [HttpStatusCodes.CONFLICT]: jsonContent(MessageSchema, "Email already exists"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(MessageSchema, "Failed to create staff account")
  }
});

const resetStaffPasswordRoute = createRoute({
  path: "/staff/{id}/password-reset",
  method: "post",
  tags: ["Staff Management"],
  description: "Resets password for an office staff",
  request: {
    params: UserIdParamSchema,
    body: jsonContent(ResetStaffPasswordBodySchema, "New password payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(MessageSchema, "Staff password reset successfully"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(MessageSchema, "Invalid password"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(MessageSchema, "Staff account not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(MessageSchema, "Failed to reset staff password")
  }
});

const updateStaffStatusRoute = createRoute({
  path: "/staff/{id}/status",
  method: "post",
  tags: ["Staff Management"],
  description: "Toggles staff status (active / rejected)",
  request: {
    params: UserIdParamSchema,
    body: jsonContent(UpdateStaffStatusBodySchema, "Status update payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(StaffActionResponseSchema, "Staff status updated successfully"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(MessageSchema, "Invalid status"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(MessageSchema, "Staff account not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(MessageSchema, "Failed to update staff status")
  }
});

const transferOfficeAdminRoute = createRoute({
  path: "/staff/{id}/transfer-admin",
  method: "post",
  tags: ["Staff Management"],
  description: "Transfers Office Admin ownership to a designated staff member",
  request: {
    params: UserIdParamSchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(StaffActionResponseSchema, "Administration transferred successfully"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(MessageSchema, "Only active admin can transfer"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(MessageSchema, "Staff account not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(MessageSchema, "Transfer failed")
  }
});

const listOfficesRoute = createRoute({
  path: "/admin/users",
  method: "get",
  tags: ["Office Management"],
  description: "Lists registered offices/admins for SuperAdmin review",
  request: {
    query: ListOfficesQuerySchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(ListOfficesResponseSchema, "Office accounts fetched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(MessageSchema, "Failed to fetch office accounts")
  }
});

const updateOfficeStatusRoute = createRoute({
  path: "/admin/users/{id}/status",
  method: "post",
  tags: ["Office Management"],
  description: "Toggles office status between active and inactive",
  request: {
    params: UserIdParamSchema,
    body: jsonContent(UpdateOfficeStatusBodySchema, "Status update payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(OfficeActionResponseSchema, "Office status updated"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(MessageSchema, "Cannot modify Super Admin"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(MessageSchema, "Office account not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(MessageSchema, "Failed to update office status")
  }
});

const approveOfficeRoute = createRoute({
  path: "/admin/users/{id}/approve",
  method: "post",
  tags: ["Office Management"],
  description: "Approves a pending office admin",
  request: {
    params: UserIdParamSchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(OfficeActionResponseSchema, "Office approved successfully"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(MessageSchema, "Cannot modify Super Admin"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(MessageSchema, "Office account not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(MessageSchema, "Failed to approve office")
  }
});

const rejectOfficeRoute = createRoute({
  path: "/admin/users/{id}/reject",
  method: "post",
  tags: ["Office Management"],
  description: "Rejects or suspends an office admin",
  request: {
    params: UserIdParamSchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(OfficeActionResponseSchema, "Office rejected successfully"),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(MessageSchema, "Cannot modify Super Admin"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(MessageSchema, "Office account not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(MessageSchema, "Failed to reject office")
  }
});

const extendSubscriptionRoute = createRoute({
  path: "/admin/users/{id}/subscription",
  method: "post",
  tags: ["Office Management"],
  description: "Manually extends an office admin's subscription",
  request: {
    params: UserIdParamSchema,
    body: jsonContent(ExtendSubscriptionBodySchema, "Subscription extension payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(OfficeActionResponseSchema, "Subscription extended successfully"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(MessageSchema, "Office account not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(MessageSchema, "Failed to extend subscription")
  }
});

const officeAdminRoute = createRouter()
  .group(authMiddleware, requireRole("admin", "super_admin"))
  .api(listStaffRoute, listStaff)
  .api(createStaffRoute, createStaff)
  .api(resetStaffPasswordRoute, resetStaffPassword)
  .api(updateStaffStatusRoute, updateStaffStatus)
  .api(transferOfficeAdminRoute, transferOfficeAdmin);

const superAdminRoute = createRouter()
  .group(authMiddleware, requireRole("super_admin"))
  .api(listOfficesRoute, listOffices)
  .api(updateOfficeStatusRoute, updateOfficeStatus)
  .api(approveOfficeRoute, approveOffice)
  .api(rejectOfficeRoute, rejectOffice)
  .api(extendSubscriptionRoute, extendSubscription);

export default createRouter()
  .route("/", publicRoute)
  .route("/", protectedRoute)
  .route("/", officeAdminRoute)
  .route("/", superAdminRoute);

