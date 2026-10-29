import { createRouter } from "@/framework/facade.js";
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

const publicRoutes = createRouter()
  .get("/billing", getBillingSettings);

const protectedRoutes = createRouter()
  .group(authMiddleware)
  .group(requireRole("admin", "super_admin"))
  .post("/payments", submitPayment)
  .get("/payments", listPayments)
  .get("/wallet", getWalletInfo)
  .post("/wallet/renew", renewSubscriptionFromWallet)
  .get("/invoices", listInvoices);

const superAdminRoutes = createRouter()
  .group(authMiddleware)
  .group(requireRole("super_admin"))
  .post("/billing", updateBillingSettings)
  .post("/payments/:id/approve", approvePayment)
  .post("/payments/:id/reject", rejectPayment);

export default createRouter()
  .route("/", publicRoutes)
  .route("/", protectedRoutes)
  .route("/", superAdminRoutes);
