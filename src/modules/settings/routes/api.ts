import { createRoute, createRouter, HttpStatusCodes, jsonContent } from "@/framework/facade.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";
import { requireRole } from "@/middlewares/role-middleware.js";
import {
  approvePayment,
  getBillingSettings,
  getWalletInfo,
  listInvoices,
  listPayments,
  rejectPayment,
  renewSubscriptionFromWallet,
  submitPayment,
  updateBillingSettings
} from "@/modules/settings/controllers/setting.controller.js";
import {
  ApprovePaymentResponseSchema,
  BillingSettingsResponseSchema,
  GenericMessageSchema,
  ListInvoicesQuerySchema,
  ListInvoicesResponseSchema,
  ListPaymentsQuerySchema,
  ListPaymentsResponseSchema,
  PaymentIdParamSchema,
  RejectPaymentResponseSchema,
  RenewSubscriptionResponseSchema,
  SubmitPaymentResponseSchema,
  SubmitPaymentSchema,
  UpdateBillingSettingsBodySchema,
  UpdateBillingSettingsResponseSchema,
  WalletInfoResponseSchema
} from "../controllers/setting.schema.js";

const getBillingSettingsRoute = createRoute({
  path: "/billing",
  method: "get",
  tags: ["Settings"],
  description: "Fetches monthly fee, payment instructions, and active plans",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(BillingSettingsResponseSchema, "Billing settings fetched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to fetch billing settings")
  }
});

const submitPaymentRoute = createRoute({
  path: "/payments",
  method: "post",
  tags: ["Settings"],
  description: "Office Admin submits subscription payment details (TrxID)",
  request: {
    body: jsonContent(SubmitPaymentSchema, "Payment details payload")
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(SubmitPaymentResponseSchema, "Payment details submitted successfully"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(GenericMessageSchema, "Invalid payment submission details"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to submit payment")
  }
});

const listPaymentsRoute = createRoute({
  path: "/payments",
  method: "get",
  tags: ["Settings"],
  description: "Lists payment transactions",
  request: {
    query: ListPaymentsQuerySchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(ListPaymentsResponseSchema, "Payments fetched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to fetch payments")
  }
});

const getWalletInfoRoute = createRoute({
  path: "/wallet",
  method: "get",
  tags: ["Settings"],
  description: "Gets current wallet balance, monthly fee, subscription status, and transaction history",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(WalletInfoResponseSchema, "Wallet info fetched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to fetch wallet info")
  }
});

const renewSubscriptionRoute = createRoute({
  path: "/wallet/renew",
  method: "post",
  tags: ["Settings"],
  description: "Office Admin manually renews subscription from wallet balance",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RenewSubscriptionResponseSchema, "Subscription renewed successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to renew subscription")
  }
});

const listInvoicesRoute = createRoute({
  path: "/invoices",
  method: "get",
  tags: ["Settings"],
  description: "Lists monthly subscription deduction invoices and statements",
  request: {
    query: ListInvoicesQuerySchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(ListInvoicesResponseSchema, "Invoices fetched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to fetch invoices")
  }
});

const updateBillingSettingsRoute = createRoute({
  path: "/billing",
  method: "post",
  tags: ["Settings"],
  description: "Creates, updates, activates, or deletes plans in billing_settings (SuperAdmin only)",
  request: {
    body: jsonContent(UpdateBillingSettingsBodySchema, "Billing settings payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(UpdateBillingSettingsResponseSchema, "Billing settings saved successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to update billing settings")
  }
});

const approvePaymentRoute = createRoute({
  path: "/payments/{id}/approve",
  method: "post",
  tags: ["Settings"],
  description: "SuperAdmin approves a payment and credits office wallet",
  request: {
    params: PaymentIdParamSchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(ApprovePaymentResponseSchema, "Payment approved successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to approve payment")
  }
});

const rejectPaymentRoute = createRoute({
  path: "/payments/{id}/reject",
  method: "post",
  tags: ["Settings"],
  description: "SuperAdmin rejects an invalid payment",
  request: {
    params: PaymentIdParamSchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RejectPaymentResponseSchema, "Payment rejected successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to reject payment")
  }
});

const publicRoutes = createRouter()
  .api(getBillingSettingsRoute, getBillingSettings);

const protectedRoutes = createRouter()
  .group(authMiddleware, requireRole("admin", "super_admin"))
  .api(submitPaymentRoute, submitPayment)
  .api(listPaymentsRoute, listPayments)
  .api(getWalletInfoRoute, getWalletInfo)
  .api(renewSubscriptionRoute, renewSubscriptionFromWallet)
  .api(listInvoicesRoute, listInvoices);

const superAdminRoutes = createRouter()
  .group(authMiddleware, requireRole("super_admin"))
  .api(updateBillingSettingsRoute, updateBillingSettings)
  .api(approvePaymentRoute, approvePayment)
  .api(rejectPaymentRoute, rejectPayment);

export default createRouter()
  .route("/", publicRoutes)
  .route("/", protectedRoutes)
  .route("/", superAdminRoutes);
