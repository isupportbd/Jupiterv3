import { and, countDistinct, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, paginate } from "@/framework/facade.js";
import { banks } from "../database/models/bank.js";
import { beneficiaries } from "../database/models/beneficiary.js";
import { branches } from "../database/models/branch.js";
import { exporters } from "../database/models/exporter.js";
import { lcNatures } from "../database/models/lc-nature.js";
import { lcs } from "../database/models/lc.js";
import { lcRecords } from "../database/models/lc-record.js";
import { monthlyLcSummaries } from "../database/models/monthly-summary.js";

function parseFilterDate(str?: string, endOfDay = false): Date | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return null;

  const match = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    const d = Number(match[3]);
    return endOfDay
      ? new Date(Date.UTC(y, m, d, 23, 59, 59, 999))
      : new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export class ReportService {
  /**
   * Report 1: Monthwise LC Summary Report
   * Instant sub-millisecond query from pre-aggregated table or on-demand live calculation.
   */
  static async getMonthwiseSummary(c: any, filters?: { year?: string; fromMonth?: string; toMonth?: string }) {
    const conditions = [];

    if (filters?.year) {
      conditions.push(sql`${monthlyLcSummaries.monthKey} LIKE ${`${filters.year}-%`}`);
    }
    if (filters?.fromMonth) {
      conditions.push(gte(monthlyLcSummaries.monthKey, filters.fromMonth));
    }
    if (filters?.toMonth) {
      conditions.push(lte(monthlyLcSummaries.monthKey, filters.toMonth));
    }

    let query = db
      .select({
        monthKey: monthlyLcSummaries.monthKey,
        totalRecords: monthlyLcSummaries.totalRecords,
        totalLcReg: monthlyLcSummaries.totalLcReg,
        totalLcUnq: monthlyLcSummaries.totalLcUnq,
        totalBenReg: monthlyLcSummaries.totalBenReg,
        totalBenUnq: monthlyLcSummaries.totalBenUnq,
        totalBankReg: monthlyLcSummaries.totalBankReg,
        totalBankUnq: monthlyLcSummaries.totalBankUnq,
        totalValue: monthlyLcSummaries.totalValue,
        updatedAt: monthlyLcSummaries.updatedAt
      })
      .from(monthlyLcSummaries);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const cachedSummaries = await query.orderBy(desc(monthlyLcSummaries.monthKey));

    if (cachedSummaries.length > 0 || (conditions.length > 0 && !filters?.year)) {
      return cachedSummaries;
    }

    // Dynamic aggregation fallback
    let liveWhere = sql`r.entry_date IS NOT NULL`;
    if (filters?.year) {
      liveWhere = sql`${liveWhere} AND EXTRACT(YEAR FROM r.entry_date) = ${Number(filters.year)}`;
    }
    if (filters?.fromMonth) {
      liveWhere = sql`${liveWhere} AND to_char(r.entry_date, 'YYYY-MM') >= ${filters.fromMonth}`;
    }
    if (filters?.toMonth) {
      liveWhere = sql`${liveWhere} AND to_char(r.entry_date, 'YYYY-MM') <= ${filters.toMonth}`;
    }

    const liveResult = await db.execute(sql`
      SELECT 
        EXTRACT(YEAR FROM r.entry_date)::int as year,
        EXTRACT(MONTH FROM r.entry_date)::int as month,
        to_char(r.entry_date, 'YYYY-MM') as month_key,
        COUNT(*)::int as total_records,
        COUNT(*)::int as total_lc_reg,
        COUNT(DISTINCT l.id)::int as total_lc_unq,
        COUNT(DISTINCT l.beneficiary_id)::int as total_ben_reg,
        COUNT(DISTINCT l.beneficiary_id)::int as total_ben_unq,
        COUNT(DISTINCT l.opening_bank_id)::int as total_bank_reg,
        COUNT(DISTINCT l.opening_bank_id)::int as total_bank_unq,
        COALESCE(SUM(l.lc_value), 0)::numeric(15,2) as total_value
      FROM lc_records r
      JOIN lcs l ON r.lc_master_id = l.id
      WHERE ${liveWhere}
      GROUP BY 1, 2, 3
      ORDER BY year DESC, month DESC
    `);

    return (liveResult as any).rows || (Array.isArray(liveResult) ? liveResult : []);
  }

  /**
   * Report 2: Local LC Detailed Report
   * Full search, bank, beneficiary, date filters, and server-side pagination.
   */
  static async getLocalLcReport(c: any, filters: {
    search?: string;
    year?: string;
    bankId?: number;
    beneficiaryId?: number;
    beneficiaryIds?: number[];
    dateFrom?: string;
    dateTo?: string;
    lcDateFrom?: string;
    lcDateTo?: string;
    entryDateFrom?: string;
    entryDateTo?: string;
    exportAll?: boolean;
  }) {
    const conditions = [];

    if (filters.year) {
      conditions.push(eq(lcs.lcYear, filters.year));
    }

    if (filters.bankId) {
      conditions.push(eq(lcs.openingBankId, filters.bankId));
    }

    if (filters.beneficiaryIds && filters.beneficiaryIds.length > 0) {
      if (filters.beneficiaryIds.length === 1) {
        conditions.push(eq(lcs.beneficiaryId, filters.beneficiaryIds[0]));
      } else {
        conditions.push(inArray(lcs.beneficiaryId, filters.beneficiaryIds));
      }
    } else if (filters.beneficiaryId) {
      conditions.push(eq(lcs.beneficiaryId, filters.beneficiaryId));
    }

    // LC Date Range
    const effectiveLcDateFrom = filters.lcDateFrom;
    const effectiveLcDateTo = filters.lcDateTo;
    if (effectiveLcDateFrom) {
      const d = parseFilterDate(effectiveLcDateFrom, false);
      if (d) conditions.push(gte(lcs.lcDate, d));
    }
    if (effectiveLcDateTo) {
      const d = parseFilterDate(effectiveLcDateTo, true);
      if (d) conditions.push(lte(lcs.lcDate, d));
    }

    // Entry Date Range
    const effectiveEntryDateFrom = filters.entryDateFrom || filters.dateFrom;
    const effectiveEntryDateTo = filters.entryDateTo || filters.dateTo;
    if (effectiveEntryDateFrom) {
      const d = parseFilterDate(effectiveEntryDateFrom, false);
      if (d) conditions.push(gte(lcRecords.entryDate, d));
    }
    if (effectiveEntryDateTo) {
      const d = parseFilterDate(effectiveEntryDateTo, true);
      if (d) conditions.push(lte(lcRecords.entryDate, d));
    }

    const benBanks = alias(banks, "ben_banks_local");
    const benBranches = alias(branches, "ben_branches_local");

    if (filters.search) {
      const cleanTerm = filters.search.trim().slice(0, 100);
      const searchTerm = `%${cleanTerm}%`;
      conditions.push(
        or(
          ilike(lcs.lcId, searchTerm),
          ilike(lcRecords.piNumber, searchTerm),
          ilike(lcRecords.bondLicense, searchTerm),
          ilike(beneficiaries.name, searchTerm),
          ilike(beneficiaries.address, searchTerm),
          ilike(exporters.name, searchTerm),
          ilike(banks.name, searchTerm),
          ilike(branches.name, searchTerm),
          ilike(benBanks.name, searchTerm),
          ilike(benBranches.name, searchTerm)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = db
      .select({
        id: lcRecords.id,
        // 1. BANK_NAME
        bankName: banks.name,
        // 2. BRANCH_NAME
        branchName: branches.name,
        // 3. ADS_CODE
        adsCode: branches.adsCode,
        // 4. LC_YEAR
        lcYear: lcs.lcYear,
        // 5. LC_NATURE
        lcNature: lcNatures.name,
        // 6. LC_SERIAL
        lcSerial: lcRecords.lcSerial,
        // 7. LC ID
        lcId: lcs.lcId,
        // 8. LC_VALUE
        lcValue: lcs.lcValue,
        // 9. CURRENCY
        currency: lcs.currency,
        // 10. LC_DATE
        lcDate: lcs.lcDate,
        // 11. LC_EXPIRY_DATE
        lcExpiryDate: lcs.lcExpiryDate,
        // 12. BB_USANSE_PERIOD
        bbUsansePeriod: lcRecords.bbUsansePeriod,
        // 13. LAST_SHIP_DATE
        lastShipDate: lcRecords.lastShipDate,
        // 14. PROCEEDS_DATE
        proceedsDate: sql<string | null>`NULL`,
        // 15. APPLICANT_NAME
        applicantName: lcs.applicantName,
        // 16. IRC
        irc: exporters.code,
        // 17. EXPORTER_INFO
        exporterInfo: sql<string | null>`CASE WHEN ${exporters.code} IS NOT NULL AND ${exporters.name} IS NOT NULL THEN ${exporters.code} || '-' || ${exporters.name} ELSE COALESCE(${exporters.name}, ${exporters.code}) END`,
        // 18. EXPORT_LC_NUMBER
        exportLcNumber: sql<string | null>`NULL`,
        // 19. BENEFICIARY_BANK
        beneficiaryBank: benBanks.name,
        // 20. BENEFICIARY_BRANCH
        beneficiaryBranch: benBranches.adsCode,
        // 21. BENEFICIARY_NAME
        beneficiaryName: beneficiaries.name,
        // 22. BENEFICIARY_ADDRESS
        beneficiaryAddress: beneficiaries.address,
        // 23. BENEFICIARY_IRC
        beneficiaryIrc: sql<string | null>`NULL`,
        // 24. BENEFICIARY_ERC
        beneficiaryErc: sql<string | null>`NULL`,
        // 25. PI_NUMBER
        piNumber: lcRecords.piNumber,
        // 26. PI_DATE
        piDate: lcRecords.piDate,
        // 27. BOND_LICENSE
        bondLicense: lcRecords.bondLicense,
        // 28. ACCEPTED
        accepted: lcRecords.accepted,
        // 29. CANCEL_YN
        cancelYn: lcRecords.cancelYn,
        // 30. CANCEL_CAUSE
        cancelCause: lcRecords.cancelCause,
        // 31. ENTRY_DATE
        entryDate: lcRecords.entryDate,
        beneficiaryId: beneficiaries.id
      })
      .from(lcRecords)
      .innerJoin(lcs, eq(lcRecords.lcMasterId, lcs.id))
      .leftJoin(banks, eq(lcs.openingBankId, banks.id))
      .leftJoin(branches, eq(lcs.openingBranchId, branches.id))
      .leftJoin(benBanks, eq(lcs.beneficiaryBankId, benBanks.id))
      .leftJoin(benBranches, eq(lcs.beneficiaryBranchId, benBranches.id))
      .leftJoin(beneficiaries, eq(lcs.beneficiaryId, beneficiaries.id))
      .leftJoin(exporters, eq(lcs.exporterId, exporters.id))
      .leftJoin(lcNatures, eq(lcs.natureId, lcNatures.id));

    if (whereClause) {
      baseQuery.where(whereClause);
    }
    baseQuery.orderBy(desc(lcRecords.entryDate), desc(lcRecords.id));

    // Fast count: counts distinct driving records without materializing all 31 projected columns
    const countQuery = db
      .select({ total: countDistinct(lcRecords.id) })
      .from(lcRecords)
      .innerJoin(lcs, eq(lcRecords.lcMasterId, lcs.id))
      .leftJoin(banks, eq(lcs.openingBankId, banks.id))
      .leftJoin(branches, eq(lcs.openingBranchId, branches.id))
      .leftJoin(benBanks, eq(lcs.beneficiaryBankId, benBanks.id))
      .leftJoin(benBranches, eq(lcs.beneficiaryBranchId, benBranches.id))
      .leftJoin(beneficiaries, eq(lcs.beneficiaryId, beneficiaries.id))
      .leftJoin(exporters, eq(lcs.exporterId, exporters.id))
      .leftJoin(lcNatures, eq(lcs.natureId, lcNatures.id));

    if (whereClause) {
      countQuery.where(whereClause);
    }

    if (filters.exportAll) {
      const [allRows, [countRow]] = await Promise.all([baseQuery, countQuery]);
      const totalCount = Number(countRow?.total ?? allRows.length);
      return {
        data: allRows,
        total: totalCount,
        current_page: 1,
        last_page: 1,
        per_page: totalCount
      };
    }

    const page = Number(c.req.query("page") || 1);
    const size = c.req.query("size");
    const perPageQuery = c.req.query("per_page");
    const perPageValue = Math.min(100, Math.max(1, Number(size || perPageQuery || 10)));
    const offset = (page - 1) * perPageValue;

    const [[countRow], rows] = await Promise.all([
      countQuery,
      baseQuery.limit(perPageValue).offset(offset)
    ]);

    const total = Number(countRow?.total ?? 0);
    const lastPage = Math.max(1, Math.ceil(total / perPageValue));
    const currentPage = Math.min(page, lastPage);

    return {
      data: rows,
      total,
      current_page: currentPage,
      last_page: lastPage,
      per_page: perPageValue
    };
  }

  /**
   * Report 3: Beneficiary Analytics & Fast Autocomplete
   */
  static async searchBeneficiaries(queryStr: string, limit = 20) {
    if (!queryStr || queryStr.trim().length === 0) {
      return await db
        .select({
          id: beneficiaries.id,
          name: beneficiaries.name,
          address: beneficiaries.address
        })
        .from(beneficiaries)
        .orderBy(desc(beneficiaries.id))
        .limit(limit);
    }

    const cleanQuery = queryStr.trim().slice(0, 100);
    const term = `%${cleanQuery}%`;
    return await db
      .select({
        id: beneficiaries.id,
        name: beneficiaries.name,
        address: beneficiaries.address
      })
      .from(beneficiaries)
      .where(ilike(beneficiaries.name, term))
      .limit(limit);
  }

  /**
   * Beneficiary 360-Degree Profile & Portfolio
   */
  static async getBeneficiaryProfile(
    c: any,
    beneficiaryId: number,
    filters: { year?: string; bankId?: number } = {}
  ) {
    const beneficiary = await db.query.beneficiaries.findFirst({
      where: eq(beneficiaries.id, beneficiaryId)
    });

    if (!beneficiary) {
      return null;
    }

    const conditions = [eq(lcs.beneficiaryId, beneficiaryId)];
    if (filters.year) {
      conditions.push(eq(lcs.lcYear, filters.year));
    }
    if (filters.bankId) {
      conditions.push(eq(lcs.openingBankId, filters.bankId));
    }

    const recordsQuery = db
      .select({
        id: lcRecords.id,
        lcId: lcs.lcId,
        lcYear: lcs.lcYear,
        lcValue: lcs.lcValue,
        currency: lcs.currency,
        lcDate: lcs.lcDate,
        entryDate: lcRecords.entryDate,
        piNumber: lcRecords.piNumber,
        bondLicense: lcRecords.bondLicense,
        bankName: banks.name,
        branchName: branches.name,
        exporterName: exporters.name
      })
      .from(lcRecords)
      .innerJoin(lcs, eq(lcRecords.lcMasterId, lcs.id))
      .leftJoin(banks, eq(lcs.openingBankId, banks.id))
      .leftJoin(branches, eq(lcs.openingBranchId, branches.id))
      .leftJoin(exporters, eq(lcs.exporterId, exporters.id))
      .where(and(...conditions))
      .orderBy(desc(lcRecords.entryDate));

    const paginated = await paginate(c, recordsQuery);

    const statsResult = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT l.id)::int as total_lcs,
        COALESCE(SUM(l.lc_value), 0)::numeric(15,2) as total_usd_value,
        COUNT(DISTINCT l.opening_bank_id)::int as total_banks,
        COUNT(DISTINCT l.exporter_id)::int as total_buyers
      FROM lc_records r
      JOIN lcs l ON r.lc_master_id = l.id
      WHERE l.beneficiary_id = ${beneficiaryId}
    `);

    const stats = (statsResult as any).rows?.[0] || statsResult[0] || {
      total_lcs: 0,
      total_usd_value: "0.00",
      total_banks: 0,
      total_buyers: 0
    };

    return {
      beneficiary,
      stats,
      records: paginated
    };
  }

  static async getBeneficiaryReport(
    c: any,
    beneficiaryId: number,
    filters: { year?: string; bankId?: number } = {}
  ) {
    return this.getBeneficiaryProfile(c, beneficiaryId, filters);
  }

  /**
   * Report 3A: Beneficiary Comprehensive Tabular Report
   * Features: LC Date Range, Entry Date Range, Beneficiary filter, search, and 10 per page pagination / full export.
   */
  static async getBeneficiaryTableReport(c: any, filters: {
    search?: string;
    beneficiaryId?: number;
    beneficiaryIds?: number[];
    lcDateFrom?: string;
    lcDateTo?: string;
    entryDateFrom?: string;
    entryDateTo?: string;
    exportAll?: boolean;
  }) {
    const conditions = [];

    if (filters.beneficiaryIds && filters.beneficiaryIds.length > 0) {
      if (filters.beneficiaryIds.length === 1) {
        conditions.push(eq(lcs.beneficiaryId, filters.beneficiaryIds[0]));
      } else {
        conditions.push(inArray(lcs.beneficiaryId, filters.beneficiaryIds));
      }
    } else if (filters.beneficiaryId) {
      conditions.push(eq(lcs.beneficiaryId, filters.beneficiaryId));
    }

    if (filters.lcDateFrom) {
      const d = parseFilterDate(filters.lcDateFrom, false);
      if (d) conditions.push(gte(lcs.lcDate, d));
    }

    if (filters.lcDateTo) {
      const d = parseFilterDate(filters.lcDateTo, true);
      if (d) conditions.push(lte(lcs.lcDate, d));
    }

    if (filters.entryDateFrom) {
      const d = parseFilterDate(filters.entryDateFrom, false);
      if (d) conditions.push(gte(lcRecords.entryDate, d));
    }

    if (filters.entryDateTo) {
      const d = parseFilterDate(filters.entryDateTo, true);
      if (d) conditions.push(lte(lcRecords.entryDate, d));
    }

    const benBanks = alias(banks, "ben_banks");
    const benBranches = alias(branches, "ben_branches");

    if (filters.search) {
      const searchTerm = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(beneficiaries.name, searchTerm),
          ilike(beneficiaries.address, searchTerm),
          ilike(lcs.lcId, searchTerm),
          ilike(banks.name, searchTerm),
          ilike(branches.name, searchTerm),
          ilike(exporters.name, searchTerm),
          ilike(benBanks.name, searchTerm),
          ilike(benBranches.name, searchTerm)
        )
      );
    }

    const baseQuery = db
      .select({
        id: lcRecords.id,
        beneficiaryId: beneficiaries.id,
        beneficiaryName: beneficiaries.name,
        beneficiaryAddress: beneficiaries.address,
        bankName: banks.name,
        branchName: branches.name,
        lcId: lcs.lcId,
        lcValue: lcs.lcValue,
        currency: lcs.currency,
        lcDate: lcs.lcDate,
        lcExpiryDate: lcs.lcExpiryDate,
        exporterInfo: sql<string>`COALESCE(NULLIF(CONCAT(${exporters.code}, '-', ${exporters.name}), '-'), ${exporters.name})`,
        beneficiaryBank: sql<string>`COALESCE(NULLIF(CONCAT(${benBranches.name}, '-', ${benBanks.name}), '-'), ${benBanks.name})`,
        entryDate: lcRecords.entryDate
      })
      .from(lcRecords)
      .innerJoin(lcs, eq(lcRecords.lcMasterId, lcs.id))
      .leftJoin(beneficiaries, eq(lcs.beneficiaryId, beneficiaries.id))
      .leftJoin(banks, eq(lcs.openingBankId, banks.id))
      .leftJoin(branches, eq(lcs.openingBranchId, branches.id))
      .leftJoin(exporters, eq(lcs.exporterId, exporters.id))
      .leftJoin(benBanks, eq(lcs.beneficiaryBankId, benBanks.id))
      .leftJoin(benBranches, eq(lcs.beneficiaryBranchId, benBranches.id));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    if (whereClause) {
      baseQuery.where(whereClause);
    }
    baseQuery.orderBy(desc(lcRecords.entryDate), desc(lcRecords.id));

    const countQuery = db
      .select({ total: countDistinct(lcRecords.id) })
      .from(lcRecords)
      .innerJoin(lcs, eq(lcRecords.lcMasterId, lcs.id))
      .leftJoin(beneficiaries, eq(lcs.beneficiaryId, beneficiaries.id))
      .leftJoin(banks, eq(lcs.openingBankId, banks.id))
      .leftJoin(branches, eq(lcs.openingBranchId, branches.id))
      .leftJoin(exporters, eq(lcs.exporterId, exporters.id))
      .leftJoin(benBanks, eq(lcs.beneficiaryBankId, benBanks.id))
      .leftJoin(benBranches, eq(lcs.beneficiaryBranchId, benBranches.id));

    if (whereClause) {
      countQuery.where(whereClause);
    }

    if (filters.exportAll) {
      const [rows, [countRow]] = await Promise.all([baseQuery, countQuery]);
      const totalCount = Number(countRow?.total ?? rows.length);
      return { data: rows, total: totalCount };
    }

    const page = Number(c.req.query("page") || 1);
    const size = c.req.query("size");
    const perPageQuery = c.req.query("per_page");
    const perPageValue = Math.min(100, Math.max(1, Number(size || perPageQuery || 10)));
    const offset = (page - 1) * perPageValue;

    const [[countRow], rows] = await Promise.all([
      countQuery,
      baseQuery.limit(perPageValue).offset(offset)
    ]);

    const total = Number(countRow?.total ?? 0);
    const lastPage = Math.max(1, Math.ceil(total / perPageValue));
    const currentPage = Math.min(page, lastPage);

    return {
      data: rows,
      total,
      current_page: currentPage,
      last_page: lastPage,
      per_page: perPageValue
    };
  }

  /**
   * Executive Dashboard Analytics: KPI metrics, top exporters & LC nature breakdown
   */
  static async getDashboardAnalytics() {
    const [kpiRes, topAmountRes, topCountRes, natureRes] = await Promise.all([
      db.execute(sql`
        SELECT 
          (SELECT count(*) FROM lc_records) as total_records,
          (SELECT count(*) FROM banks) as total_banks,
          (SELECT count(*) FROM beneficiaries) as total_beneficiaries,
          (SELECT count(*) FROM exporters WHERE name IS NOT NULL AND name NOT IN ('--', '-', '00-Not Found', 'N/A', 'NA', 'NONE') AND name NOT ILIKE 'not found%') as total_exporters,
          (SELECT count(*) FROM lc_natures) as total_natures,
          (SELECT coalesce(sum(lc_value), 0) FROM lcs) as total_val,
          (SELECT coalesce(max(lc_value), 0) FROM lcs) as max_val,
          (SELECT coalesce(min(lc_value), 0) FROM lcs WHERE lc_value > 0) as min_val,
          (SELECT coalesce(avg(lc_value), 0) FROM lcs WHERE lc_value > 0) as avg_val
      `),
      db.execute(sql`
        SELECT e.id, coalesce(e.name, 'Unknown') as name, sum(l.lc_value) as total_amount, count(l.id) as lc_count
        FROM lcs l
        JOIN exporters e ON l.exporter_id = e.id
        WHERE e.name IS NOT NULL 
          AND e.name NOT IN ('--', '-', '00-Not Found', 'N/A', 'NA', 'NONE')
          AND e.name NOT ILIKE 'not found%'
        GROUP BY e.id, e.name
        ORDER BY total_amount DESC
        LIMIT 5
      `),
      db.execute(sql`
        SELECT e.id, coalesce(e.name, 'Unknown') as name, count(l.id) as lc_count, sum(l.lc_value) as total_amount
        FROM lcs l
        JOIN exporters e ON l.exporter_id = e.id
        WHERE e.name IS NOT NULL 
          AND e.name NOT IN ('--', '-', '00-Not Found', 'N/A', 'NA', 'NONE')
          AND e.name NOT ILIKE 'not found%'
        GROUP BY e.id, e.name
        ORDER BY lc_count DESC
        LIMIT 5
      `),
      db.execute(sql`
        SELECT n.id, coalesce(n.name, 'Other') as nature_name, count(l.id) as lc_count, sum(l.lc_value) as total_amount
        FROM lcs l
        JOIN lc_natures n ON l.nature_id = n.id
        GROUP BY n.id, n.name
        ORDER BY lc_count DESC
      `)
    ]);

    const kpiRows = (kpiRes as any).rows || (Array.isArray(kpiRes) ? kpiRes : []);
    const kpi = (kpiRows[0] as any) || {};

    const topAmountRows = (topAmountRes as any).rows || (Array.isArray(topAmountRes) ? topAmountRes : []);
    const topCountRows = (topCountRes as any).rows || (Array.isArray(topCountRes) ? topCountRes : []);
    const natureRows = (natureRes as any).rows || (Array.isArray(natureRes) ? natureRes : []);

    return {
      kpi: {
        totalRecords: Number(kpi.total_records || 0),
        totalBanks: Number(kpi.total_banks || 0),
        totalBeneficiaries: Number(kpi.total_beneficiaries || 0),
        totalExporters: Number(kpi.total_exporters || 0),
        totalNatures: Number(kpi.total_natures || 0),
        totalLcValue: Number(kpi.total_val || 0),
        maxLcValue: Number(kpi.max_val || 0),
        minLcValue: Number(kpi.min_val || 0),
        avgLcValue: Number(kpi.avg_val || 0)
      },
      topExportersByAmount: topAmountRows.map((r: any) => ({
        id: Number(r.id),
        name: String(r.name),
        totalAmount: Number(r.total_amount || 0),
        lcCount: Number(r.lc_count || 0)
      })),
      topExportersByCount: topCountRows.map((r: any) => ({
        id: Number(r.id),
        name: String(r.name),
        lcCount: Number(r.lc_count || 0),
        totalAmount: Number(r.total_amount || 0)
      })),
      lcNatureDistribution: natureRows.map((r: any) => ({
        id: Number(r.id),
        natureName: String(r.nature_name),
        lcCount: Number(r.lc_count || 0),
        totalAmount: Number(r.total_amount || 0)
      }))
    };
  }
}

