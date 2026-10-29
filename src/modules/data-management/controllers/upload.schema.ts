import { z } from "@/framework/facade.js";
import { BatchUploadSchema } from "../schemas/ingestion.schema.js";

export { BatchUploadSchema };

export const BatchUploadResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    insertedCount: z.number(),
    skippedCount: z.number().optional(),
    affectedMonths: z.array(z.string()).optional(),
    errors: z.array(z.any()).optional()
  }).optional()
});

export const FinalizeUploadBodySchema = z.object({
  months: z.array(z.string()).optional()
});

export const FinalizeUploadResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    refreshedMonths: z.array(z.string()).optional()
  }).optional()
});

export const DeleteMonthDataBodySchema = z.object({
  month: z.string().optional(),
  months: z.array(z.string()).optional()
});

export const DeleteMonthDataResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.string(), z.any()).optional()
});

export const DeleteMonthChunkBodySchema = z.object({
  month: z.string(),
  batchSize: z.number().optional()
});

export const DeleteMonthChunkResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    month: z.string().optional(),
    done: z.boolean(),
    remaining: z.number().optional(),
    deletedInBatch: z.number().optional(),
    totalDeletedSoFar: z.number().optional()
  }).optional()
});
