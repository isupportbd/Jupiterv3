import { z } from "@/framework/facade.js";

export const StorageStatsResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    totalSize: z.string(),
    totalBytes: z.number(),
    tables: z.array(z.record(z.string(), z.any()))
  })
});

export const RestoreBackupResponseSchema = z.object({
  message: z.string(),
  details: z.string().optional()
});

export const GenericMessageSchema = z.object({
  message: z.string()
});
