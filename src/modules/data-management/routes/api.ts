import { authMiddleware } from "@/middlewares/auth-middleware.js";
import { requireRole } from "@/middlewares/role-middleware.js";
import { subscriptionMiddleware } from "@/middlewares/subscription-middleware.js";
import { createRouter } from "@/framework/facade.js";
import {
  beneficiaryReport,
  beneficiaryTableReport,
  dashboardAnalytics,
  localLcReport,
  monthwiseSummary,
  searchBeneficiaries
} from "../controllers/report.controller.js";
import { deleteMonthChunk, deleteMonthData, uploadBatch } from "../controllers/upload.controller.js";

// Reports router: accessible by Admin, Staff (user), and SuperAdmin
const reportRouter = createRouter()
  .group(authMiddleware)
  .group(subscriptionMiddleware)
  .group(requireRole("admin", "user", "super_admin"))
  .get("/dashboard/analytics", dashboardAnalytics)
  .get("/reports/monthwise", monthwiseSummary)
  .get("/reports/local-lc", localLcReport)
  .get("/reports/beneficiary", beneficiaryTableReport)
  .get("/beneficiaries/search", searchBeneficiaries)
  .get("/reports/beneficiary/:id", beneficiaryReport);

// Admin Data Management router (Upload & Month Purge): accessible by Office Admin and SuperAdmin
const adminManagementRouter = createRouter()
  .group(authMiddleware)
  .group(subscriptionMiddleware)
  .group(requireRole("admin", "super_admin"))
  .post("/upload/batch", uploadBatch)
  .post("/reports/monthwise/delete", deleteMonthData)
  .post("/reports/monthwise/delete-chunk", deleteMonthChunk);

export default createRouter()
  .route("/", reportRouter)
  .route("/", adminManagementRouter);
