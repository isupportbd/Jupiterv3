import type { Handler } from "hono";
import { cache, HttpStatusCodes } from "@/framework/facade.js";
import { ReportService } from "../services/report.service.js";

/**
 * Report 1: Monthwise LC Summary
 * GET /api/bond/reports/monthwise
 */
export const monthwiseSummary: Handler = async (c: any) => {
  try {
    const year = c.req.query("year") || "";
    const fromMonth = c.req.query("fromMonth") || "";
    const toMonth = c.req.query("toMonth") || "";
    const cacheKey = `reports:monthwise:${year}:${fromMonth}:${toMonth}`;

    const data = await cache.remember(cacheKey, 300, async () => {
      return ReportService.getMonthwiseSummary(c, { year, fromMonth, toMonth });
    });

    return c.json(
      {
        message: "Monthwise summary fetched successfully",
        data
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Monthwise summary error:", error);
    return c.json({ message: "Failed to fetch monthwise summary" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Report 2: Local LC Detailed Report with Filters and Pagination
 * GET /api/bond/reports/local-lc
 */
export const localLcReport: Handler = async (c: any) => {
  try {
    const search = c.req.query("search");
    const year = c.req.query("year");
    const bankId = c.req.query("bankId") ? Number(c.req.query("bankId")) : undefined;
    const beneficiaryId = c.req.query("beneficiaryId") ? Number(c.req.query("beneficiaryId")) : undefined;
    const beneficiaryIdsRaw = c.req.query("beneficiaryIds");
    const beneficiaryIds = beneficiaryIdsRaw
      ? beneficiaryIdsRaw.split(",").map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n))
      : undefined;
    const lcDateFrom = c.req.query("lcDateFrom");
    const lcDateTo = c.req.query("lcDateTo");
    const entryDateFrom = c.req.query("entryDateFrom") || c.req.query("dateFrom");
    const entryDateTo = c.req.query("entryDateTo") || c.req.query("dateTo");
    const exportAll = c.req.query("exportAll") === "true";

    const result = await ReportService.getLocalLcReport(c, {
      search,
      year,
      bankId,
      beneficiaryId,
      beneficiaryIds,
      dateFrom: entryDateFrom,
      dateTo: entryDateTo,
      lcDateFrom,
      lcDateTo,
      entryDateFrom,
      entryDateTo,
      exportAll
    });

    return c.json(
      {
        message: "Local LC records fetched successfully",
        data: result.data,
        meta: {
          total: result.total,
          currentPage: result.current_page,
          lastPage: result.last_page,
          perPage: result.per_page
        }
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Local LC report error:", error);
    return c.json({ message: "Failed to fetch Local LC report" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Sub-2ms Beneficiary Search / Autocomplete
 * GET /api/bond/beneficiaries/search
 */
export const searchBeneficiaries: Handler = async (c: any) => {
  try {
    const q = c.req.query("q") || "";
    const limit = c.req.query("limit") ? Number(c.req.query("limit")) : 20;

    const data = await ReportService.searchBeneficiaries(q, limit);
    return c.json(
      {
        message: "Beneficiaries searched successfully",
        data
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Search beneficiaries error:", error);
    return c.json({ message: "Failed to search beneficiaries" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Report 3: Beneficiary Detailed LC Portfolio & Analytics
 * GET /api/bond/reports/beneficiary/:id
 */
export const beneficiaryReport: Handler = async (c: any) => {
  try {
    const id = Number(c.req.param("id"));
    const year = c.req.query("year");
    const bankId = c.req.query("bankId") ? Number(c.req.query("bankId")) : undefined;

    const data = await ReportService.getBeneficiaryReport(c, id, { year, bankId });

    if (!data) {
      return c.json({ message: "Beneficiary not found" }, HttpStatusCodes.NOT_FOUND);
    }

    return c.json(
      {
        message: "Beneficiary analytics fetched successfully",
        data
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Beneficiary report error:", error);
    return c.json({ message: "Failed to fetch beneficiary report" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Report 3A: Beneficiary Comprehensive Tabular Report
 * GET /api/data-management/reports/beneficiary
 */
export const beneficiaryTableReport: Handler = async (c: any) => {
  try {
    const search = c.req.query("search");
    const beneficiaryId = c.req.query("beneficiaryId") ? Number(c.req.query("beneficiaryId")) : undefined;
    const beneficiaryIdsParam = c.req.query("beneficiaryIds");
    let beneficiaryIds: number[] | undefined;
    if (beneficiaryIdsParam) {
      beneficiaryIds = String(beneficiaryIdsParam)
        .split(",")
        .map(Number)
        .filter((n) => !isNaN(n) && n > 0);
    } else if (beneficiaryId) {
      beneficiaryIds = [beneficiaryId];
    }

    const lcDateFrom = c.req.query("lcDateFrom");
    const lcDateTo = c.req.query("lcDateTo");
    const entryDateFrom = c.req.query("entryDateFrom");
    const entryDateTo = c.req.query("entryDateTo");
    const exportAll = c.req.query("export") === "1" || c.req.query("exportAll") === "1";

    const result = await ReportService.getBeneficiaryTableReport(c, {
      search,
      beneficiaryId,
      beneficiaryIds,
      lcDateFrom,
      lcDateTo,
      entryDateFrom,
      entryDateTo,
      exportAll
    });

    if ("current_page" in result) {
      return c.json(
        {
          message: "Beneficiary table report fetched successfully",
          data: result.data,
          meta: {
            total: result.total,
            currentPage: result.current_page,
            lastPage: result.last_page,
            perPage: result.per_page
          }
        },
        HttpStatusCodes.OK
      );
    }

    return c.json(
      {
        message: "Beneficiary report exported successfully",
        data: result.data
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Beneficiary table report error:", error);
    return c.json({ message: "Failed to fetch beneficiary table report" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Executive Dashboard Analytics: KPIs, Top Exporters & LC Nature
 * GET /api/data-management/dashboard/analytics
 */
export const dashboardAnalytics: Handler = async (c: any) => {
  try {
    const cacheKey = "reports:dashboard:analytics";
    const data = await cache.remember(cacheKey, 180, async () => {
      return ReportService.getDashboardAnalytics();
    });

    return c.json(
      {
        message: "Dashboard analytics fetched successfully",
        data
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return c.json({ message: "Failed to fetch dashboard analytics" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

