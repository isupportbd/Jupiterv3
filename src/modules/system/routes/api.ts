import { createRoute, createRouter, HttpStatusCodes, jsonContent } from "@/framework/facade.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";
import { requireRole } from "@/middlewares/role-middleware.js";
import { subscriptionMiddleware } from "@/middlewares/subscription-middleware.js";
import { downloadBackup, getStorageStats, restoreBackup } from "@/modules/system/controllers/backup.controller.js";
import {
  GenericMessageSchema,
  RestoreBackupResponseSchema,
  StorageStatsResponseSchema
} from "../controllers/backup.schema.js";

const getStorageStatsRoute = createRoute({
  path: "/storage-size",
  method: "get",
  tags: ["System"],
  description: "Live diagnostics on PostgreSQL database size and individual table sizes",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(StorageStatsResponseSchema, "Storage stats fetched successfully"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to fetch storage stats")
  }
});

const downloadBackupRoute = createRoute({
  path: "/backup/download",
  method: "get",
  tags: ["System"],
  description: "Streams native database backup directly as a downloadable SQL file",
  responses: {
    [HttpStatusCodes.OK]: {
      description: "SQL backup file stream",
      content: {
        "application/sql": {
          schema: {
            type: "string",
            format: "binary"
          }
        }
      }
    },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to generate database backup")
  }
});

const restoreBackupRoute = createRoute({
  path: "/backup/restore",
  method: "post",
  tags: ["System"],
  description: "Restores the database from an uploaded SQL backup file",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(RestoreBackupResponseSchema, "Database restored successfully"),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(GenericMessageSchema, "No valid SQL backup file uploaded"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(GenericMessageSchema, "Failed to restore database backup")
  }
});

const storageRoutes = createRouter()
  .group(authMiddleware, subscriptionMiddleware, requireRole("admin", "user", "super_admin", "superadmin"))
  .api(getStorageStatsRoute, getStorageStats);

const backupRoutes = createRouter()
  .group(authMiddleware, requireRole("super_admin", "superadmin"))
  .api(downloadBackupRoute, downloadBackup)
  .api(restoreBackupRoute, restoreBackup);

export default createRouter()
  .route("/", storageRoutes)
  .route("/", backupRoutes);
