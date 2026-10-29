import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { cache, db } from "@/framework/facade.js";
import { banks } from "../database/models/bank.js";
import { beneficiaries } from "../database/models/beneficiary.js";
import { branches } from "../database/models/branch.js";
import { exporters } from "../database/models/exporter.js";
import { lcNatures } from "../database/models/lc-nature.js";
import { lcs } from "../database/models/lc.js";
import { lcRecords } from "../database/models/lc-record.js";
import { monthlyLcSummaries } from "../database/models/monthly-summary.js";
import { PurgeService } from "./purge.service.js";

export interface RawLcRow {
  [key: string]: any;
}

export class IngestionService {
  private purgeService = new PurgeService();
  private bankCache = new Map<string, number>();
  private branchCache = new Map<string, number>();
  private natureCache = new Map<string, number>();
  private exporterCache = new Map<string, number>();
  private beneficiaryCache = new Map<string, number>();
  private lcMasterCache = new Map<string, number>();

  /**
   * Pre-load existing master entity caches to avoid repetitive SELECT queries.
   */
  async initCache() {
    const existingBanks = await db.select({ id: banks.id, name: banks.name }).from(banks);
    for (const b of existingBanks) {
      this.bankCache.set(b.name.trim().toLowerCase(), b.id);
    }

    const existingBranches = await db.select({ id: branches.id, bankId: branches.bankId, name: branches.name, adsCode: branches.adsCode }).from(branches);
    for (const br of existingBranches) {
      const key = `${br.bankId}|${br.name.trim().toLowerCase()}|${(br.adsCode || "").trim().toLowerCase()}`;
      this.branchCache.set(key, br.id);
    }

    const existingNatures = await db.select({ id: lcNatures.id, name: lcNatures.name }).from(lcNatures);
    for (const n of existingNatures) {
      this.natureCache.set(n.name.trim().toLowerCase(), n.id);
    }

    const existingExporters = await db.select({ id: exporters.id, name: exporters.name }).from(exporters);
    for (const exp of existingExporters) {
      this.exporterCache.set(exp.name.trim().toLowerCase(), exp.id);
    }

    const existingBeneficiaries = await db.select({ id: beneficiaries.id, name: beneficiaries.name }).from(beneficiaries);
    for (const ben of existingBeneficiaries) {
      this.beneficiaryCache.set(ben.name.trim().toLowerCase(), ben.id);
    }

    const existingLcs = await db.select({ id: lcs.id, lcId: lcs.lcId }).from(lcs);
    for (const l of existingLcs) {
      this.lcMasterCache.set(l.lcId.trim().toLowerCase(), l.id);
    }
  }

  private isValidBankName(name: string): boolean {
    if (!name || name.length < 3) return false;
    const lower = name.toLowerCase().trim();

    // Reject obvious address patterns or postal codes
    if (
      /^(mirpur|hemayetpur|savar|gazipur|dhaka-\d|chittagong|khulna|sylhet|road\b|house\b|plot\b|flat\b|sector\b|block\b|ward\b|post\b|village\b)/i.test(lower) ||
      /^\d+[-/,\s]/.test(lower)
    ) {
      return false;
    }

    // Must have institutional indicators (bank, plc, ltd, limited, corp, etc.)
    const bankKeywords = ["bank", "plc", "ltd", "limited", "corp", "hsbc", "citi", "woori", "habib", "krishi", "unnayan", "kallyan", "trust", "chartered", "societe"];
    return bankKeywords.some((kw) => lower.includes(kw));
  }

  /**
   * Resolves Bank ID using in-memory cache, inserting only if missing.
   */
  async resolveBank(name?: string): Promise<number | null> {
    if (!name || !name.trim()) return null;
    const cleanName = name.trim();
    if (!this.isValidBankName(cleanName)) return null;
    const key = cleanName.toLowerCase();

    if (this.bankCache.has(key)) {
      return this.bankCache.get(key)!;
    }

    try {
      const [inserted] = await db
        .insert(banks)
        .values({ name: cleanName })
        .onConflictDoNothing()
        .returning({ id: banks.id });

      if (inserted) {
        this.bankCache.set(key, inserted.id);
        return inserted.id;
      }
    } catch {}

    const existing = await db.query.banks.findFirst({
      where: eq(banks.name, cleanName)
    });
    if (existing) {
      this.bankCache.set(key, existing.id);
      return existing.id;
    }
    return null;
  }

  private cleanBranchCode(val: any): string {
    if (val === null || val === undefined) return "";
    let str = String(val).trim();
    if (/^\d+$/.test(str)) {
      str = str.replace(/^0+(?=\d)/, "");
      return str || "0";
    }
    return str;
  }

  /**
   * Resolves Branch ID under a given bankId.
   */
  async resolveBranch(bankId: number | null, name?: string, adsCode?: string): Promise<number | null> {
    if (!bankId || !name || !name.trim()) return null;
    const cleanName = name.trim();
    const cleanAds = adsCode ? this.cleanBranchCode(adsCode) : null;
    const key = `${bankId}|${cleanName.toLowerCase()}|${(cleanAds || "").toLowerCase()}`;

    if (this.branchCache.has(key)) {
      return this.branchCache.get(key)!;
    }

    try {
      const [inserted] = await db
        .insert(branches)
        .values({
          bankId,
          name: cleanName,
          adsCode: cleanAds
        })
        .onConflictDoNothing()
        .returning({ id: branches.id });

      if (inserted) {
        this.branchCache.set(key, inserted.id);
        return inserted.id;
      }
    } catch {}

    const existing = await db.query.branches.findFirst({
      where: eq(branches.name, cleanName)
    });
    if (existing) {
      this.branchCache.set(key, existing.id);
      return existing.id;
    }
    return null;
  }

  /**
   * Resolves LC Nature ID (e.g. Inland BTB L/C(Usance)).
   */
  async resolveNature(name?: string): Promise<number | null> {
    if (!name || !name.trim()) return null;
    const cleanName = name.trim();
    const key = cleanName.toLowerCase();

    if (this.natureCache.has(key)) {
      return this.natureCache.get(key)!;
    }

    try {
      const [inserted] = await db
        .insert(lcNatures)
        .values({ name: cleanName })
        .onConflictDoNothing()
        .returning({ id: lcNatures.id });

      if (inserted) {
        this.natureCache.set(key, inserted.id);
        return inserted.id;
      }
    } catch {}

    const existing = await db.query.lcNatures.findFirst({
      where: eq(lcNatures.name, cleanName)
    });
    if (existing) {
      this.natureCache.set(key, existing.id);
      return existing.id;
    }
    return null;
  }

  /**
   * Resolves Exporter / RMG Factory ID (from EXPORTER_INFO).
   * Format in file: "260326210604723-AVANTEX APPARELS LTD." or name alone.
   */
  async resolveExporter(rawInfo?: string, fallbackName?: string): Promise<number | null> {
    const raw = (rawInfo || fallbackName || "").trim().replace(/^["']|["']$/g, "");
    if (!raw) return null;

    let code: string | null = null;
    let cleanName = raw;

    const hyphenIdx = raw.indexOf("-");
    if (hyphenIdx > 5) {
      code = raw.slice(0, hyphenIdx).trim();
      cleanName = raw.slice(hyphenIdx + 1).trim();
    }

    if (!cleanName) cleanName = raw;
    const key = cleanName.toLowerCase();

    if (this.exporterCache.has(key)) {
      return this.exporterCache.get(key)!;
    }

    try {
      const [inserted] = await db
        .insert(exporters)
        .values({
          name: cleanName,
          code
        })
        .onConflictDoNothing()
        .returning({ id: exporters.id });

      if (inserted) {
        this.exporterCache.set(key, inserted.id);
        return inserted.id;
      }
    } catch {}

    const existing = await db.query.exporters.findFirst({
      where: eq(exporters.name, cleanName)
    });
    if (existing) {
      this.exporterCache.set(key, existing.id);
      return existing.id;
    }
    return null;
  }

  /**
   * Resolves Beneficiary ID using in-memory cache, inserting only if missing.
   */
  async resolveBeneficiary(name?: string, address?: string): Promise<number | null> {
    if (!name || !name.trim()) return null;
    const cleanName = name.trim().replace(/^["']|["']$/g, "");
    const cleanAddress = address ? address.trim().replace(/^["']|["']$/g, "") : null;
    const key = cleanName.toLowerCase();

    if (this.beneficiaryCache.has(key)) {
      return this.beneficiaryCache.get(key)!;
    }

    try {
      const [inserted] = await db
        .insert(beneficiaries)
        .values({
          name: cleanName,
          address: cleanAddress
        })
        .onConflictDoNothing()
        .returning({ id: beneficiaries.id });

      if (inserted) {
        this.beneficiaryCache.set(key, inserted.id);
        return inserted.id;
      }
    } catch {}

    const existing = await db.query.beneficiaries.findFirst({
      where: eq(beneficiaries.name, cleanName)
    });
    if (existing) {
      this.beneficiaryCache.set(key, existing.id);
      return existing.id;
    }
    return null;
  }

  /**
   * Cleans raw LC ID string and handles scientific notation (e.g. 1.94526E+12 -> 1945260000000).
   */
  cleanLcId(val: any): string {
    if (val === undefined || val === null) return "";
    let str = String(val).trim().replace(/^["']|["']$/g, "");
    if (/^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) {
      try {
        const num = BigInt(Math.round(Number(str)));
        return num.toString();
      } catch {}
    }
    return str;
  }

  /**
   * Resolves Master LC ID. Inserts into `lcs` if new, or returns existing ID.
   */
  async resolveLcMaster(params: {
    lcId: string;
    lcYear?: string;
    lcValue?: string;
    currency?: string;
    lcDate?: Date | null;
    lcExpiryDate?: Date | null;
    openingBankId: number | null;
    openingBranchId: number | null;
    beneficiaryBankId: number | null;
    beneficiaryBranchId: number | null;
    natureId: number | null;
    exporterId: number | null;
    beneficiaryId: number | null;
    applicantName?: string | null;
  }): Promise<number | null> {
    const cleanId = this.cleanLcId(params.lcId);
    if (!cleanId) return null;
    const key = cleanId.toLowerCase();

    if (this.lcMasterCache.has(key)) {
      return this.lcMasterCache.get(key)!;
    }

    try {
      const [inserted] = await db
        .insert(lcs)
        .values({
          lcId: cleanId,
          lcYear: params.lcYear ? params.lcYear.slice(0, 10) : null,
          lcValue: params.lcValue || "0",
          currency: params.currency || "USD",
          lcDate: params.lcDate,
          lcExpiryDate: params.lcExpiryDate,
          openingBankId: params.openingBankId,
          openingBranchId: params.openingBranchId,
          beneficiaryBankId: params.beneficiaryBankId,
          beneficiaryBranchId: params.beneficiaryBranchId,
          natureId: params.natureId,
          exporterId: params.exporterId,
          beneficiaryId: params.beneficiaryId,
          applicantName: params.applicantName ? params.applicantName.slice(0, 255) : null
        })
        .onConflictDoNothing()
        .returning({ id: lcs.id });

      if (inserted) {
        this.lcMasterCache.set(key, inserted.id);
        return inserted.id;
      }
    } catch {}

    const existing = await db.query.lcs.findFirst({
      where: eq(lcs.lcId, cleanId)
    });
    if (existing) {
      if (params.applicantName && !existing.applicantName) {
        await db.update(lcs)
          .set({ applicantName: params.applicantName.slice(0, 255) })
          .where(eq(lcs.id, existing.id));
      }
      this.lcMasterCache.set(key, existing.id);
      return existing.id;
    }
    return null;
  }

  /**
   * Helper to parse dates formatted like "19-Jan-26", "2026-01-19", or standard ISO strings.
   * Uses UTC Noon (12:00:00) to permanently prevent timezone day-shift bugs.
   */
  private parseDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    const str = String(val).trim();
    if (!str || str === "N/A" || str === "-" || str === "undefined" || str === "null") return null;

    // 1. Check YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (ymdMatch) {
      const y = parseInt(ymdMatch[1], 10);
      const m = parseInt(ymdMatch[2], 10) - 1;
      const d = parseInt(ymdMatch[3], 10);
      return new Date(Date.UTC(y, m, d, 12, 0, 0));
    }

    // 2. Check DD-Mon-YY or DD-Mon-YYYY (e.g. 19-Jan-26 or 01-Jan-2024)
    const parts = str.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ](\d{2,4})/);
    if (parts) {
      const day = parseInt(parts[1], 10);
      const monthStr = parts[2].toLowerCase().slice(0, 3);
      let year = parseInt(parts[3], 10);
      if (year < 100) year += (year > 50 ? 1900 : 2000);
      const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const month = monthNames.indexOf(monthStr);
      if (month !== -1) {
        return new Date(Date.UTC(year, month, day, 12, 0, 0));
      }
    }

    // 4. Check DD/MM/YY or DD-MM-YY (2-digit year)
    const dmyShort = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
    if (dmyShort) {
      const d = parseInt(dmyShort[1], 10);
      const m = parseInt(dmyShort[2], 10) - 1;
      let y = parseInt(dmyShort[3], 10);
      y += y > 50 ? 1900 : 2000;
      return new Date(Date.UTC(y, m, d, 12, 0, 0));
    }

    // 5. Check ISO formatted strings with 'T' (e.g. 2026-01-19T00:00:00Z)
    if (str.includes("T")) {
      const isoYmd = str.split("T")[0].split("-");
      if (isoYmd.length === 3) {
        const y = parseInt(isoYmd[0], 10);
        const m = parseInt(isoYmd[1], 10) - 1;
        const d = parseInt(isoYmd[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return new Date(Date.UTC(y, m, d, 12, 0, 0));
        }
      }
    }

    // Avoid arbitrary local-time parsing; reject invalid/ambiguous formats
    return null;
  }

  /**
   * Helper to parse numeric LC values with commas e.g. "2,057.00" -> "2057.00".
   */
  private parseNumeric(val: any): string {
    if (val === undefined || val === null || val === "") return "0";
    let cleaned = String(val).replace(/,/g, "").trim();
    cleaned = cleaned.replace(/[^0-9.-]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === ".") return "0";
    const num = Number(cleaned);
    return isNaN(num) ? "0" : String(num);
  }

  /**
   * Helper to extract key case-insensitively from a row object.
   */
  private getVal(row: any, ...keys: string[]): any {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
      const lowerKey = k.toLowerCase();
      for (const [rk, rv] of Object.entries(row)) {
        if (rk.toLowerCase() === lowerKey && rv !== undefined && rv !== null && rv !== "") {
          return rv;
        }
      }
    }
    return "";
  }

  /**
   * Ingests a batch of normalized records with MD5 deduplication and integer foreign keys.
   */
  async processBatch(rows: RawLcRow[], userId: number) {
    await this.initCache();

    const recordsToInsert = [];
    const affectedMonths = new Set<string>();

    for (const raw of rows) {
      // Mandatory Filter: Both BANK_NAME and ENTRY_DATE are strictly required.
      // If either is missing, this row will NOT be uploaded.
      const openingBankName = String(this.getVal(raw, "BANK_NAME", "bank_name", "bankName")).trim();
      const rawEntryDate = this.getVal(raw, "Entry Date", "entry_date", "entryDate", "ENTRY_DATE", "ENTRY DATE");
      const entryDate = this.parseDate(rawEntryDate);

      if (!openingBankName || !entryDate || openingBankName.toLowerCase().startsWith("total") || openingBankName.toLowerCase().startsWith("grand")) {
        continue;
      }

      const rawLcId = this.getVal(raw, "LC ID", "lc_id", "lcId");
      const lcId = this.cleanLcId(rawLcId);
      if (!lcId) continue;

      // 1. Opening Bank & Branch
      const openingBranchName = this.getVal(raw, "BRANCH_NAME", "branch_name");
      const openingAdsCode = this.cleanBranchCode(this.getVal(raw, "ADSCODE", "ads_code", "adsCode"));

      const openingBankId = await this.resolveBank(openingBankName);
      const openingBranchId = await this.resolveBranch(openingBankId, openingBranchName, openingAdsCode);

      // 2. Beneficiary Bank & Branch (e.g. "Gulshan Branch-BRAC Bank PLC" & "3085")
      const rawBenBank = String(this.getVal(raw, "BENEFICIARY_BANK", "beneficiary_bank")).trim();
      const rawBenBranchCode = this.cleanBranchCode(this.getVal(raw, "BENIFICIARY_BRANCH", "beneficiary_branch"));
      let benBankId: number | null = null;
      let benBranchId: number | null = null;

      if (rawBenBank) {
        if (rawBenBank.includes("-")) {
          const parts = rawBenBank.split("-");
          const benBranchName = parts[0]?.trim();
          const benBankName = parts.slice(1).join("-").trim();
          benBankId = await this.resolveBank(benBankName);
          benBranchId = await this.resolveBranch(benBankId, benBranchName, rawBenBranchCode);
        } else {
          benBankId = await this.resolveBank(rawBenBank);
          if (rawBenBranchCode) {
            benBranchId = await this.resolveBranch(benBankId, rawBenBranchCode, rawBenBranchCode);
          }
        }
      }

      // 3. LC Nature
      const natureName = this.getVal(raw, "LC_NATURE", "lc_nature");
      const natureId = await this.resolveNature(natureName);

      // 4. Exporter (from EXPORTER_INFO) and Applicant Name
      const exporterInfo = this.getVal(raw, "EXPORTER_INFO", "exporter_info");
      const rawApplicant = this.getVal(raw, "APPLICANT_NAME", "applicant_name");
      const applicantName = rawApplicant ? String(rawApplicant).trim() : null;
      const exporterId = await this.resolveExporter(exporterInfo);

      // 5. Beneficiary (Local Supplier)
      const benName = this.getVal(raw, "BENEFICIARY_NAME", "beneficiary_name");
      const benAddress = this.getVal(raw, "BENEFICIARY_ADDRESS", "beneficiary_address");
      const beneficiaryId = await this.resolveBeneficiary(benName, benAddress);

      // 6. Master LC Attributes
      const lcYear = String(this.getVal(raw, "LC_YEAR", "lc_year")).trim();
      const lcValue = this.parseNumeric(this.getVal(raw, "LC_VALUE", "lc_value"));
      const rawCurr = String(this.getVal(raw, "CURRENCY", "currency") || "USD").trim().toUpperCase();
      const currency = rawCurr === "1" ? "USD" : (rawCurr || "USD");
      const lcDate = this.parseDate(this.getVal(raw, "LC_DATE", "lc_date"));
      const lcExpiryDate = this.parseDate(this.getVal(raw, "LC_EXPIRY_DATE", "lc_expiry_date"));

      const lcMasterId = await this.resolveLcMaster({
        lcId,
        lcYear,
        lcValue,
        currency,
        lcDate,
        lcExpiryDate,
        openingBankId,
        openingBranchId,
        beneficiaryBankId: benBankId,
        beneficiaryBranchId: benBranchId,
        natureId,
        exporterId,
        beneficiaryId,
        applicantName
      });

      if (!lcMasterId) continue;

      // 7. Shipment Specific Fields
      const lcSerial = String(this.getVal(raw, "LC_SERIAL", "lc_serial")).trim();
      const lastShipDate = this.parseDate(this.getVal(raw, "LAST_SHIP_DATE", "last_ship_date"));
      const piDate = this.parseDate(this.getVal(raw, "PI_DATE", "pi_date"));

      const bbUsansePeriod = String(this.getVal(raw, "BB_USANSE_PERIOD", "bb_usanse_period")).trim();
      const piNumber = String(this.getVal(raw, "PI_NUMBER", "pi_number")).trim();
      const bondLicense = String(this.getVal(raw, "Bond License", "bond_license")).trim();
      const accepted = String(this.getVal(raw, "ACCEPTED", "accepted")).trim();
      const cancelYn = String(this.getVal(raw, "CANCEL_YN", "cancel_yn") || "N").trim();
      const cancelCause = String(this.getVal(raw, "CANCEL_CAUSE", "cancel_cause")).trim();

      // Compute MD5 hash for shipment deduplication:
      // Includes LC ID, Serial, PI Number, Entry Date, and Last Ship Date
      const rawString = `${lcId}|${lcSerial}|${piNumber}|${entryDate?.toISOString()}|${lastShipDate?.toISOString()}`;
      const recordHash = createHash("md5").update(rawString).digest("hex");

      const monthKey = entryDate.toISOString().slice(0, 7);
      affectedMonths.add(monthKey);

      recordsToInsert.push({
        userId,
        lcMasterId,
        lcSerial: lcSerial ? lcSerial.slice(0, 50) : null,
        bbUsansePeriod: bbUsansePeriod ? bbUsansePeriod.slice(0, 100) : null,
        lastShipDate,
        piNumber: piNumber ? piNumber.slice(0, 150) : null,
        piDate,
        bondLicense: bondLicense ? bondLicense.slice(0, 150) : null,
        accepted: accepted ? accepted.slice(0, 100) : null,
        cancelYn: cancelYn.slice(0, 10),
        cancelCause: cancelCause ? cancelCause.slice(0, 255) : null,
        entryDate,
        recordHash
      });
    }

    if (recordsToInsert.length === 0) {
      return { insertedCount: 0 };
    }

    // Bulk insert with onConflictDoNothing on recordHash
    const inserted = await db
      .insert(lcRecords)
      .values(recordsToInsert)
      .onConflictDoNothing()
      .returning({ id: lcRecords.id });

    // Recalculate pre-aggregated monthly metrics for affected months
    await this.refreshMonthlySummaries(Array.from(affectedMonths));

    // Invalidate cached reports & storage stats after new data ingestion
    try {
      await cache.forgetPattern("reports:monthwise:*");
      await cache.forget("system:storage:v1");
    } catch (e) {
      console.error("Cache invalidation error:", e);
    }

    return {
      insertedCount: inserted.length,
      skippedCount: recordsToInsert.length - inserted.length
    };
  }

  /**
   * Recalculates monthly pre-aggregated analytics instantly.
   */
  async refreshMonthlySummaries(monthKeys: string[]) {
    for (const m of monthKeys) {
      const metrics = await db.execute(sql`
        SELECT 
          COUNT(*)::int as total_records,
          COUNT(DISTINCT l.id)::int as total_lc_unq,
          COUNT(*)::int as total_lc_reg,
          COUNT(DISTINCT l.beneficiary_id)::int as total_ben_unq,
          COUNT(l.beneficiary_id)::int as total_ben_reg,
          COUNT(DISTINCT l.opening_bank_id)::int as total_bank_unq,
          COUNT(l.opening_bank_id)::int as total_bank_reg,
          COALESCE(SUM(l.lc_value), 0)::numeric(15,2) as total_value
        FROM lc_records r
        JOIN lcs l ON r.lc_master_id = l.id
        WHERE to_char(r.entry_date, 'YYYY-MM') = ${m}
      `);

      const stats = (metrics as any).rows?.[0] || metrics[0];
      if (stats && parseInt(stats.total_records) > 0) {
        await db
          .insert(monthlyLcSummaries)
          .values({
            monthKey: m,
            totalRecords: parseInt(stats.total_records) || 0,
            totalLcReg: parseInt(stats.total_lc_reg) || 0,
            totalLcUnq: parseInt(stats.total_lc_unq) || 0,
            totalBenReg: parseInt(stats.total_ben_reg) || 0,
            totalBenUnq: parseInt(stats.total_ben_unq) || 0,
            totalBankReg: parseInt(stats.total_bank_reg) || 0,
            totalBankUnq: parseInt(stats.total_bank_unq) || 0,
            totalValue: stats.total_value || "0",
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: monthlyLcSummaries.monthKey,
            set: {
              totalRecords: parseInt(stats.total_records) || 0,
              totalLcReg: parseInt(stats.total_lc_reg) || 0,
              totalLcUnq: parseInt(stats.total_lc_unq) || 0,
              totalBenReg: parseInt(stats.total_ben_reg) || 0,
              totalBenUnq: parseInt(stats.total_ben_unq) || 0,
              totalBankReg: parseInt(stats.total_bank_reg) || 0,
              totalBankUnq: parseInt(stats.total_bank_unq) || 0,
              totalValue: stats.total_value || "0",
              updatedAt: new Date()
            }
          });
      }
    }
  }

  /**
   * Fully cleans and purges records for given calendar month(s) with complete relational integrity.
   */
  async purgeMonthRecords(monthKeys: string[]) {
    return this.purgeService.purgeMonthRecords(monthKeys, () => this.clearCache());
  }

  /**
   * Purges a single batch/chunk of shipment records for a month.
   */
  async purgeMonthChunk(month: string, batchSize = 3000) {
    return this.purgeService.purgeMonthChunk(month, batchSize, () => this.clearCache());
  }

  /**
   * Invalidate local in-memory entity caches so fresh uploads repopulate cleanly.
   */
  clearCache() {
    this.beneficiaryCache.clear();
    this.exporterCache.clear();
    this.lcMasterCache.clear();
    this.bankCache.clear();
    this.branchCache.clear();
  }
}
