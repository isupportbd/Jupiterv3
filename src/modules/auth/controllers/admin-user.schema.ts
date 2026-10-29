import { z } from "@/framework/facade.js";
import { UserSchema } from "./auth.schema.js";

export const ListOfficesQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
});

export const ListOfficesResponseSchema = z.object({
  message: z.string(),
  data: z.array(z.record(z.string(), z.any())),
  meta: z.object({
    total: z.number(),
    currentPage: z.number(),
    lastPage: z.number(),
    perPage: z.number()
  }).optional()
});

export const UserIdParamSchema = z.object({
  id: z.string()
});

export const UpdateOfficeStatusBodySchema = z.object({
  status: z.enum(["active", "inactive"])
});

export const ExtendSubscriptionBodySchema = z.object({
  days: z.number().optional()
});

export const OfficeActionResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.string(), z.any()).optional()
});

export const ListStaffResponseSchema = z.object({
  message: z.string(),
  data: z.array(z.record(z.string(), z.any()))
});

export const CreateStaffBodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional()
});

export const ResetStaffPasswordBodySchema = z.object({
  password: z.string().min(6)
});

export const UpdateStaffStatusBodySchema = z.object({
  status: z.enum(["active", "rejected"])
});

export const StaffActionResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.string(), z.any()).optional()
});

export const GenericMessageSchema = z.object({
  message: z.string()
});
