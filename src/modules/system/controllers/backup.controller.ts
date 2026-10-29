import { spawn } from "node:child_process";
import fsSync, { promises as fsPromises } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { Handler } from "hono";
import { sql } from "drizzle-orm";
import { cache, db, HttpStatusCodes } from "@/framework/facade.js";
import { databaseConfig } from "@/config/index.js";

function findPgDump(): string {
  const candidates = [
    "D:\\LARAGON\\bin\\postgresql\\postgresql\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
    "pg_dump"
  ];
  for (const c of candidates) {
    if (fsSync.existsSync(c)) return c;
  }
  return "pg_dump";
}

function findPsql(): string {
  const candidates = [
    "D:\\LARAGON\\bin\\postgresql\\postgresql\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe",
    "psql"
  ];
  for (const c of candidates) {
    if (fsSync.existsSync(c)) return c;
  }
  return "psql";
}

function extractRows(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.rows)) return res.rows;
  if (res && Array.isArray(res[0])) return res[0];
  return [];
}

function extractFirstRow(res: any): any {
  const rows = extractRows(res);
  return rows[0] || {};
}

/**
 * Why: Live diagnostics on PostgreSQL database size and individual table sizes.
 * When: SuperAdmin checks storage metrics on /system/backup.
 * Where: GET /api/system/storage-size
 */
export const getStorageStats: Handler = async (c: any) => {
  try {
    const data = await cache.remember("system:storage:v1", 300, async () => {
      const dbSizeResult: any = await db.execute(
        sql`SELECT pg_size_pretty(pg_database_size(current_database())) as total_size,
                   pg_database_size(current_database()) as total_bytes`
      );

      const tablesResult: any = await db.execute(
        sql`SELECT
              relname as table_name,
              pg_size_pretty(pg_total_relation_size(relid)) as total_size,
              pg_total_relation_size(relid) as total_bytes,
              n_live_tup as row_count
            FROM pg_stat_user_tables
            ORDER BY pg_total_relation_size(relid) DESC`
      );

      const dbRow = extractFirstRow(dbSizeResult);
      const totalSize = dbRow.total_size || dbRow.pretty_size || "0 MB";
      const totalBytes = Number(dbRow.total_bytes || 0);
      const tables = extractRows(tablesResult);

      return {
        totalSize,
        totalBytes,
        tables
      };
    });

    return c.json(
      {
        message: "Storage stats fetched successfully",
        data
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Storage stats error:", error);
    return c.json({ message: "Failed to fetch storage stats" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Streams native pg_dump database backup directly as a downloadable SQL file.
 * When: SuperAdmin clicks "Download Backup" on /system/backup.
 * Where: GET /api/system/backup/download
 */
export const downloadBackup: Handler = async (c: any) => {
  try {
    const pgDumpBin = findPgDump();
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const filename = `jupiter_v3_backup_${timestamp}.sql`;

    const args = [
      `--dbname=${databaseConfig.url}`,
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-acl"
    ];

    const child = spawn(pgDumpBin, args, {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    c.header("Content-Type", "application/sql");
    c.header("Content-Disposition", `attachment; filename="${filename}"`);

    const readable = Readable.toWeb(child.stdout);
    return c.body(readable as any);
  } catch (error) {
    console.error("Backup download error:", error);
    return c.json({ message: "Failed to generate database backup" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Restores the database from an uploaded SQL backup file using native psql.
 * When: SuperAdmin uploads a valid .sql backup on /system/backup.
 * Where: POST /api/system/backup/restore
 */
export const restoreBackup: Handler = async (c: any) => {
  let tempFilePath: string | null = null;
  try {
    const body = await c.req.parseBody();
    const file = body["file"];

    if (!file || !(file instanceof File)) {
      return c.json({ message: "No valid SQL backup file uploaded" }, HttpStatusCodes.BAD_REQUEST);
    }

    if (!file.name.toLowerCase().endsWith(".sql")) {
      return c.json({ message: "Invalid file format. Please upload a .sql file" }, HttpStatusCodes.BAD_REQUEST);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempFileName = `restore_${Date.now()}_${Math.random().toString(36).substring(7)}.sql`;
    tempFilePath = path.join(os.tmpdir(), tempFileName);
    await fsPromises.writeFile(tempFilePath, buffer);

    const psqlBin = findPsql();
    const args = [
      `--dbname=${databaseConfig.url}`,
      "-f",
      tempFilePath
    ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn(psqlBin, args, {
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"]
      });

      let stderrData = "";
      child.stderr.on("data", (chunk) => {
        stderrData += chunk.toString();
      });

      child.on("error", (err) => {
        reject(err);
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql restore process failed with code ${code}: ${stderrData}`));
        }
      });
    });

    // Invalidate cached storage stats
    await cache.forget("system:storage:v1");

    return c.json(
      {
        message: "Database restored successfully",
        filename: file.name,
        size: file.size
      },
      HttpStatusCodes.OK
    );
  } catch (error: any) {
    console.error("Database restore error:", error);
    return c.json(
      {
        message: error.message || "Failed to restore database from backup"
      },
      HttpStatusCodes.INTERNAL_SERVER_ERROR
    );
  } finally {
    if (tempFilePath && fsSync.existsSync(tempFilePath)) {
      try {
        await fsPromises.unlink(tempFilePath);
      } catch (cleanupErr) {
        console.error("Failed to clean up temporary restore file:", cleanupErr);
      }
    }
  }
};
