import { createRouter } from "@/framework/facade.js";
import { authMiddleware } from "@/middlewares/auth-middleware.js";
import { requireRole } from "@/middlewares/role-middleware.js";
import { subscriptionMiddleware } from "@/middlewares/subscription-middleware.js";
import { downloadBackup, getStorageStats, restoreBackup } from "@/modules/system/controllers/backup.controller.js";

const storageRoutes = createRouter()
  .group(authMiddleware)
  .group(subscriptionMiddleware)
  .group(requireRole("admin", "user", "super_admin", "superadmin"))
  .get("/storage-size", getStorageStats);

const backupRoutes = createRouter()
  .group(authMiddleware)
  .group(requireRole("super_admin", "superadmin"))
  .get("/backup/download", downloadBackup)
  .post("/backup/restore", restoreBackup);

export default createRouter()
  .route("/", storageRoutes)
  .route("/", backupRoutes);
