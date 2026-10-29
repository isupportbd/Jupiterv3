import { eq, sql } from "drizzle-orm";
import { cache, db } from "@/framework/facade.js";
import { monthlyLcSummaries } from "../database/models/monthly-summary.js";

export class PurgeService {
  /**
   * Fully cleans and purges records for given calendar month(s) with complete relational integrity:
   * 1. Deletes records from lc_records matching entry_date / createdAt month.
   * 2. Deletes orphaned master LCs from lcs table (LCs with no remaining shipments).
   * 3. Deletes orphaned beneficiaries & exporters (entities with no remaining LCs).
   * 4. Deletes from monthly_lc_summaries for those month keys.
   */
  async purgeMonthRecords(monthKeys: string[], onPurged?: () => void) {
    if (!monthKeys || monthKeys.length === 0) return { deletedCount: 0, months: [] };

    const cleanMonths = monthKeys.map((m) => String(m).trim()).filter((m) => /^\d{4}-\d{2}$/.test(m));
    if (cleanMonths.length === 0) return { deletedCount: 0, months: [] };

    let totalDeleted = 0;

    await db.transaction(async (tx) => {
      for (const m of cleanMonths) {
        const [yearStr, monthStr] = m.split("-");
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1, 0, 0, 0));

        // 1. Delete matching lc_records using index scan
        const deleteRes = await tx.execute(sql`
          WITH deleted AS (
            DELETE FROM lc_records
            WHERE (entry_date >= ${startDate.toISOString()} AND entry_date < ${endDate.toISOString()})
               OR (entry_date IS NULL AND created_at >= ${startDate.toISOString()} AND created_at < ${endDate.toISOString()})
               OR to_char(COALESCE(entry_date, created_at), 'YYYY-MM') = ${m}
            RETURNING id
          )
          SELECT count(*)::int as count FROM deleted;
        `);
        const delCount = Number((deleteRes.rows?.[0] as any)?.count || (deleteRes as any)?.[0]?.count || 0);
        totalDeleted += delCount;

        // 2. Remove summary row for this month
        await tx.delete(monthlyLcSummaries).where(eq(monthlyLcSummaries.monthKey, m));
      }

      // 3. Clean up orphaned Master LCs (contracts that have 0 shipment records in lc_records)
      await tx.execute(sql`
        DELETE FROM lcs
        WHERE NOT EXISTS (
          SELECT 1 FROM lc_records WHERE lc_records.lc_master_id = lcs.id
        )
      `);

      // 4. Clean up orphaned beneficiaries (beneficiaries not linked to any LCs)
      await tx.execute(sql`
        DELETE FROM beneficiaries
        WHERE NOT EXISTS (
          SELECT 1 FROM lcs WHERE lcs.beneficiary_id = beneficiaries.id
        )
      `);

      // 5. Clean up orphaned exporters (exporters not linked to any LCs)
      await tx.execute(sql`
        DELETE FROM exporters
        WHERE NOT EXISTS (
          SELECT 1 FROM lcs WHERE lcs.exporter_id = exporters.id
        )
      `);

      // 6. Clean up orphaned branches (branches not linked to any LCs)
      await tx.execute(sql`
        DELETE FROM branches
        WHERE NOT EXISTS (
          SELECT 1 FROM lcs WHERE lcs.opening_branch_id = branches.id OR lcs.beneficiary_branch_id = branches.id
        )
      `);

      // 7. Clean up orphaned banks (banks not linked to any LCs and with no branches)
      await tx.execute(sql`
        DELETE FROM banks
        WHERE NOT EXISTS (
          SELECT 1 FROM lcs WHERE lcs.opening_bank_id = banks.id OR lcs.beneficiary_bank_id = banks.id
        ) AND NOT EXISTS (
          SELECT 1 FROM branches WHERE branches.bank_id = banks.id
        )
      `);
    });

    if (onPurged) {
      onPurged();
    }

    try {
      await cache.forgetPattern("reports:monthwise:*");
      await cache.forget("system:storage:v1");
    } catch (e) {
      console.error("Cache purge invalidation error:", e);
    }

    return {
      deletedCount: totalDeleted,
      months: cleanMonths
    };
  }

  /**
   * Purges a single batch/chunk of shipment records for a month.
   * Completely prevents PostgreSQL table locking and server freeze by using subquery with LIMIT.
   */
  async purgeMonthChunk(month: string, batchSize = 3000, onPurged?: () => void) {
    const cleanMonth = String(month).trim();
    const [yearStr, monthStr] = cleanMonth.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(monthNum === 12 ? year + 1 : year, monthNum === 12 ? 0 : monthNum, 1, 0, 0, 0));

    // 1. Check remaining records count
    const countRes = await db.execute(sql`
      SELECT count(*)::int as count FROM lc_records
      WHERE (entry_date >= ${startDate.toISOString()} AND entry_date < ${endDate.toISOString()})
         OR (entry_date IS NULL AND created_at >= ${startDate.toISOString()} AND created_at < ${endDate.toISOString()})
         OR to_char(COALESCE(entry_date, created_at), 'YYYY-MM') = ${cleanMonth}
    `);
    const initialRemaining = Number((countRes.rows?.[0] as any)?.count || (countRes as any)?.[0]?.count || 0);

    if (initialRemaining === 0) {
      // All shipment records for this month are removed. Perform final relational cleanup:
      await db.execute(sql`
        DELETE FROM lcs
        WHERE NOT EXISTS (
          SELECT 1 FROM lc_records WHERE lc_records.lc_master_id = lcs.id
        )
      `);
      await db.execute(sql`
        DELETE FROM beneficiaries
        WHERE NOT EXISTS (
          SELECT 1 FROM lcs WHERE lcs.beneficiary_id = beneficiaries.id
        )
      `);
      await db.execute(sql`
        DELETE FROM exporters
        WHERE NOT EXISTS (
          SELECT 1 FROM lcs WHERE lcs.exporter_id = exporters.id
        )
      `);
      await db.execute(sql`
        DELETE FROM branches
        WHERE NOT EXISTS (
          SELECT 1 FROM lcs WHERE lcs.opening_branch_id = branches.id OR lcs.beneficiary_branch_id = branches.id
        )
      `);
      await db.execute(sql`
        DELETE FROM banks
        WHERE NOT EXISTS (
          SELECT 1 FROM lcs WHERE lcs.opening_bank_id = banks.id OR lcs.beneficiary_bank_id = banks.id
        ) AND NOT EXISTS (
          SELECT 1 FROM branches WHERE branches.bank_id = banks.id
        )
      `);
      await db.delete(monthlyLcSummaries).where(eq(monthlyLcSummaries.monthKey, cleanMonth));

      if (onPurged) {
        onPurged();
      }

      try {
        await cache.forgetPattern("reports:monthwise:*");
        await cache.forget("system:storage:v1");
      } catch (e) {
        console.error("Cache chunk purge invalidation error:", e);
      }

      return {
        deletedInBatch: 0,
        remaining: 0,
        done: true
      };
    }

    // 2. Delete single chunk with LIMIT
    const deleteRes = await db.execute(sql`
      WITH to_delete AS (
        SELECT id FROM lc_records
        WHERE (entry_date >= ${startDate.toISOString()} AND entry_date < ${endDate.toISOString()})
           OR (entry_date IS NULL AND created_at >= ${startDate.toISOString()} AND created_at < ${endDate.toISOString()})
           OR to_char(COALESCE(entry_date, created_at), 'YYYY-MM') = ${cleanMonth}
        LIMIT ${batchSize}
      )
      DELETE FROM lc_records
      WHERE id IN (SELECT id FROM to_delete)
      RETURNING id;
    `);

    const deletedInBatch = Number((deleteRes.rows as any)?.length || (deleteRes as any)?.length || 0);
    const newRemaining = Math.max(0, initialRemaining - deletedInBatch);

    return {
      deletedInBatch,
      remaining: newRemaining,
      done: newRemaining === 0
    };
  }
}
