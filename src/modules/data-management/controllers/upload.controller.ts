import type { Handler } from "hono";
import { HttpStatusCodes } from "@/framework/facade.js";
import { IngestionService } from "../services/ingestion.service.js";
import { BatchUploadSchema } from "../schemas/ingestion.schema.js";

const ingestionService = new IngestionService();
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Ingests a batch of normalized records (Admin Only).
 * POST /api/bond/upload/batch
 */
export const uploadBatch: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const deferSummary = c.req.query("deferSummary") === "true";
    const rawBody = await c.req.json();

    const parsed = BatchUploadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        {
          message: "Invalid ingestion batch payload.",
          errors: parsed.error.flatten()
        },
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const rows = parsed.data;
    const result = await ingestionService.processBatch(rows, auth.id, deferSummary);

    return c.json(
      {
        message: `Successfully processed ${rows.length} rows (${result.insertedCount} new, ${rows.length - result.insertedCount} duplicates skipped).`,
        data: result
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Batch upload error:", error);
    return c.json({ message: "Batch ingestion failed" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Finalizes an upload session by recomputing pre-aggregated summaries for affected months in a single shot.
 * POST /api/data-management/upload/finalize
 */
export const finalizeUpload: Handler = async (c: any) => {
  try {
    const rawBody = await c.req.json().catch(() => ({}));
    const months = Array.isArray(rawBody.months) ? rawBody.months : [];
    if (months.length > 0) {
      await ingestionService.refreshMonthlySummaries(months);
    }
    return c.json(
      {
        message: "Upload finalized and summaries refreshed successfully.",
        data: { refreshedMonths: months }
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Finalize upload error:", error);
    return c.json({ message: "Failed to finalize upload." }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Purges all records for a specific month with complete relational cascading.
 * POST /api/data-management/reports/monthwise/delete
 * Body: { month: "2026-10" } or { months: ["2026-10"] }
 */
export const deleteMonthData: Handler = async (c: any) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const rawMonths = body.months || (body.month ? [body.month] : []);
    const months = Array.isArray(rawMonths)
      ? rawMonths.map((m: any) => String(m).trim()).filter(Boolean)
      : [];

    if (!months.length) {
      return c.json({ message: "No month specified for deletion (format YYYY-MM)." }, HttpStatusCodes.BAD_REQUEST);
    }

    if (months.length > 12) {
      return c.json({ message: "Too many months requested for purge (maximum 12 months per request)." }, HttpStatusCodes.BAD_REQUEST);
    }

    for (const m of months) {
      if (!MONTH_RE.test(m)) {
        return c.json({ message: `Invalid month format: '${m}' (expected YYYY-MM where MM is 01-12).` }, HttpStatusCodes.BAD_REQUEST);
      }
    }

    const uniqueMonths = [...new Set(months)];
    const result = await ingestionService.purgeMonthRecords(uniqueMonths);

    return c.json(
      {
        message: `Successfully purged ${result.deletedCount.toLocaleString()} records for ${result.months.join(", ")} and cleaned relational tables.`,
        data: result
      },
      HttpStatusCodes.OK
    );
  } catch (error: any) {
    console.error("Purge month data error:", error);
    return c.json({ message: error.message || "Failed to purge month records." }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Purges records in chunks with real-time progress to permanently prevent server hanging.
 * POST /api/data-management/reports/monthwise/delete-chunk
 * Body: { month: "2026-10", batchSize?: 3000 }
 */
export const deleteMonthChunk: Handler = async (c: any) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const month = String(body.month || "").trim();
    const batchSize = Math.min(10000, Math.max(500, Number(body.batchSize || 3000)));

    if (!month || !MONTH_RE.test(month)) {
      return c.json({ message: "Invalid or missing month (expected format YYYY-MM where MM is 01-12)." }, HttpStatusCodes.BAD_REQUEST);
    }

    const result = await ingestionService.purgeMonthChunk(month, batchSize);

    return c.json(
      {
        message: result.done ? `Month ${month} completely purged.` : `Purged ${result.deletedInBatch} records.`,
        data: result
      },
      HttpStatusCodes.OK
    );
  } catch (error: any) {
    console.error("Purge month chunk error:", error);
    return c.json({ message: error.message || "Failed to purge chunk." }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
