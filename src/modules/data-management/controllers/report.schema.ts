import { z } from "@/framework/facade.js";

export const MonthwiseSummaryQuerySchema = z.object({
  year: z.string().optional(),
  fromMonth: z.string().optional(),
  toMonth: z.string().optional()
});

export const MonthwiseSummaryResponseSchema = z.object({
  message: z.string(),
  data: z.array(z.record(z.string(), z.any()))
});

export const LocalLcReportQuerySchema = z.object({
  search: z.string().optional(),
  year: z.string().optional(),
  bankId: z.string().optional(),
  beneficiaryId: z.string().optional(),
  beneficiaryIds: z.string().optional(),
  lcDateFrom: z.string().optional(),
  lcDateTo: z.string().optional(),
  entryDateFrom: z.string().optional(),
  entryDateTo: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  exportAll: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
});

export const LocalLcReportResponseSchema = z.object({
  message: z.string(),
  data: z.array(z.record(z.string(), z.any())),
  meta: z.object({
    total: z.number(),
    currentPage: z.number(),
    lastPage: z.number(),
    perPage: z.number()
  }).optional()
});

export const BeneficiarySearchQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.string().optional()
});

export const BeneficiarySearchResponseSchema = z.object({
  message: z.string(),
  data: z.array(z.record(z.string(), z.any()))
});

export const BeneficiaryReportParamsSchema = z.object({
  id: z.string()
});

export const BeneficiaryReportQuerySchema = z.object({
  year: z.string().optional(),
  bankId: z.string().optional()
});

export const BeneficiaryReportResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.string(), z.any()).optional()
});

export const BeneficiaryTableReportQuerySchema = z.object({
  search: z.string().optional(),
  beneficiaryId: z.string().optional(),
  beneficiaryIds: z.string().optional(),
  lcDateFrom: z.string().optional(),
  lcDateTo: z.string().optional(),
  entryDateFrom: z.string().optional(),
  entryDateTo: z.string().optional(),
  export: z.string().optional(),
  exportAll: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
});

export const BeneficiaryTableReportResponseSchema = z.object({
  message: z.string(),
  data: z.array(z.record(z.string(), z.any())),
  meta: z.object({
    total: z.number(),
    currentPage: z.number(),
    lastPage: z.number(),
    perPage: z.number()
  }).optional()
});

export const DashboardAnalyticsResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.string(), z.any())
});

export const GenericMessageSchema = z.object({
  message: z.string()
});
