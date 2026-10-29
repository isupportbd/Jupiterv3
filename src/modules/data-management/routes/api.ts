import { createRoute, createRouter, HttpStatusCodes, jsonContent } from "@/framework/facade.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";
import { requireRole } from "@/middlewares/role-middleware.js";
import { subscriptionMiddleware } from "@/middlewares/subscription-middleware.js";
import {
  beneficiaryReport,
  beneficiaryTableReport,
  dashboardAnalytics,
  localLcReport,
  monthwiseSummary,
  searchBeneficiaries
} from "../controllers/report.controller.js";
import {
  BeneficiaryReportParamsSchema,
  BeneficiaryReportQuerySchema,
  BeneficiaryReportResponseSchema,
  BeneficiarySearchQuerySchema,
  BeneficiarySearchResponseSchema,
  BeneficiaryTableReportQuerySchema,
  BeneficiaryTableReportResponseSchema,
  DashboardAnalyticsResponseSchema,
  GenericMessageSchema,
  LocalLcReportQuerySchema,
  LocalLcReportResponseSchema,
  MonthwiseSummaryQuerySchema,
  MonthwiseSummaryResponseSchema
} from "../controllers/report.schema.js";
import { deleteMonthChunk, deleteMonthData, uploadBatch } from "../controllers/upload.controller.js";
import {
  BatchUploadResponseSchema,
  BatchUploadSchema,
  DeleteMonthChunkBodySchema,
  DeleteMonthChunkResponseSchema,
  DeleteMonthDataBodySchema,
  DeleteMonthDataResponseSchema
} from "../controllers/upload.schema.js";

const dashboardAnalyticsRoute = createRoute({
  path: "/dashboard/analytics",
  method: "get",
  tags: ["Data Management"],
  description: "Executive Dashboard Analytics: KPIs, Top Exporters & LC Nature",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(DashboardAnalyticsResponseSchema, "Dashboard analytics fetched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to fetch dashboard analytics")
  }
});

const monthwiseSummaryRoute = createRoute({
  path: "/reports/monthwise",
  method: "get",
  tags: ["Data Management"],
  description: "Report 1: Monthwise LC Summary",
  request: {
    query: MonthwiseSummaryQuerySchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(MonthwiseSummaryResponseSchema, "Monthwise summary fetched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to fetch monthwise summary")
  }
});

const localLcReportRoute = createRoute({
  path: "/reports/local-lc",
  method: "get",
  tags: ["Data Management"],
  description: "Report 2: Local LC Detailed Report with Filters and Pagination",
  request: {
    query: LocalLcReportQuerySchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(LocalLcReportResponseSchema, "Local LC records fetched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to fetch Local LC report")
  }
});

const beneficiaryTableReportRoute = createRoute({
  path: "/reports/beneficiary",
  method: "get",
  tags: ["Data Management"],
  description: "Report 3A: Beneficiary Comprehensive Tabular Report",
  request: {
    query: BeneficiaryTableReportQuerySchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(BeneficiaryTableReportResponseSchema, "Beneficiary table report fetched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to fetch beneficiary table report")
  }
});

const searchBeneficiariesRoute = createRoute({
  path: "/beneficiaries/search",
  method: "get",
  tags: ["Data Management"],
  description: "Beneficiary Search / Autocomplete",
  request: {
    query: BeneficiarySearchQuerySchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(BeneficiarySearchResponseSchema, "Beneficiaries searched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to search beneficiaries")
  }
});

const beneficiaryReportRoute = createRoute({
  path: "/reports/beneficiary/{id}",
  method: "get",
  tags: ["Data Management"],
  description: "Report 3: Beneficiary Detailed LC Portfolio & Analytics",
  request: {
    params: BeneficiaryReportParamsSchema,
    query: BeneficiaryReportQuerySchema
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(BeneficiaryReportResponseSchema, "Beneficiary analytics fetched successfully"),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(GenericMessageSchema, "Beneficiary not found"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to fetch beneficiary report")
  }
});

const uploadBatchRoute = createRoute({
  path: "/upload/batch",
  method: "post",
  tags: ["Data Management"],
  description: "Ingests a batch of normalized records (Admin Only)",
  request: {
    body: jsonContent(BatchUploadSchema, "Batch upload records payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(BatchUploadResponseSchema, "Successfully processed batch"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(GenericMessageSchema, "Invalid ingestion batch payload"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Batch ingestion failed")
  }
});

const deleteMonthDataRoute = createRoute({
  path: "/reports/monthwise/delete",
  method: "post",
  tags: ["Data Management"],
  description: "Purges all records for a specific month with complete relational cascading",
  request: {
    body: jsonContent(DeleteMonthDataBodySchema, "Purge month payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(DeleteMonthDataResponseSchema, "Successfully purged records"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(GenericMessageSchema, "Invalid month format or parameters"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to purge month records")
  }
});

const deleteMonthChunkRoute = createRoute({
  path: "/reports/monthwise/delete-chunk",
  method: "post",
  tags: ["Data Management"],
  description: "Purges records in chunks with real-time progress",
  request: {
    body: jsonContent(DeleteMonthChunkBodySchema, "Purge chunk payload")
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(DeleteMonthChunkResponseSchema, "Chunk purge progress"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(GenericMessageSchema, "Invalid or missing month"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to purge chunk")
  }
});

// Reports router: accessible by Admin, Staff (user), and SuperAdmin
const reportRouter = createRouter()
  .group(authMiddleware, subscriptionMiddleware, requireRole("admin", "user", "super_admin"))
  .api(dashboardAnalyticsRoute, dashboardAnalytics)
  .api(monthwiseSummaryRoute, monthwiseSummary)
  .api(localLcReportRoute, localLcReport)
  .api(beneficiaryTableReportRoute, beneficiaryTableReport)
  .api(searchBeneficiariesRoute, searchBeneficiaries)
  .api(beneficiaryReportRoute, beneficiaryReport);

// Admin Data Management router (Upload & Month Purge): accessible by Office Admin and SuperAdmin
const adminManagementRouter = createRouter()
  .group(authMiddleware, subscriptionMiddleware, requireRole("admin", "super_admin"))
  .api(uploadBatchRoute, uploadBatch)
  .api(deleteMonthDataRoute, deleteMonthData)
  .api(deleteMonthChunkRoute, deleteMonthChunk);

export default createRouter()
  .route("/", reportRouter)
  .route("/", adminManagementRouter);
