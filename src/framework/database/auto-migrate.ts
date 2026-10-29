import fs from "node:fs";
import path from "node:path";
import { database, databaseDialect } from "@/framework/database/connection.js";
import { logger } from "@/framework/support/logger.js";
import RoleSeeder from "@/modules/auth/database/seeders/role.js";
import UserSeeder from "@/modules/auth/database/seeders/user.js";
import SettingSeeder from "@/modules/settings/database/seeders/setting.js";

/**
 * Why: Automatically ensures database tables and default seed data exist on boot.
 * When: Server bootstrap in Docker/production or local runtime.
 * Where: Called in src/framework/kernel.ts right after initDatabase().
 * How: Uses drizzle-orm migrator to execute SQL migrations idempotently,
 *      then ensures default roles, super admin, and settings are present.
 */
export async function runAutoMigrations(): Promise<void> {
  const dialect = databaseDialect();
  const migrationsFolder = path.resolve(process.cwd(), `src/database/migrations/${dialect}`);

  if (!fs.existsSync(migrationsFolder)) {
    return;
  }

  try {
    if (dialect === "postgresql") {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      await migrate(database(), { migrationsFolder });
    } else if (dialect === "mysql") {
      const { migrate } = await import("drizzle-orm/mysql2/migrator");
      await migrate(database(), { migrationsFolder });
    } else {
      const { migrate } = await import("drizzle-orm/libsql/migrator");
      await migrate(database(), { migrationsFolder });
    }

    // Auto-seed initial roles, admin user, and billing settings (idempotent)
    try {
      await RoleSeeder();
      await UserSeeder();
      await SettingSeeder();
    } catch (seedErr) {
      logger.warn("Auto-seed notice", {
        message: seedErr instanceof Error ? seedErr.message : String(seedErr)
      });
    }
  } catch (error) {
    logger.error("Auto-migration notice", {
      error: error instanceof Error ? error.message : error
    });
  }
}
