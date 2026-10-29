import { z } from "@/framework/facade.js";
import { SubmitPaymentSchema } from "../schemas/payment.schema.js";

export { SubmitPaymentSchema };

export const BillingSettingsResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.string(), z.any())
});

export const UpdateBillingSettingsBodySchema = z.record(z.string(), z.any());

export const UpdateBillingSettingsResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.string(), z.any()).optional()
});

export const SubmitPaymentResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.string(), z.any()).optional()
});

export const ListPaymentsQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
});

export const ListPaymentsResponseSchema = z.object({
  message: z.string(),
  data: z.array(z.record(z.string(), z.any())),
  meta: z.object({
    total: z.number(),
    currentPage: z.number(),
    lastPage: z.number(),
    perPage: z.number()
  }).optional()
});

export const PaymentIdParamSchema = z.object({
  id: z.string()
});

export const ApprovePaymentResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    payment: z.record(z.string(), z.any()).optional(),
    walletBalance: z.any().optional(),
    subscriptionExpiresAt: z.any().optional()
  }).optional()
});

export const RejectPaymentResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.string(), z.any()).optional()
});

export const WalletInfoResponseSchema = z.object({
  message: z.string(),
  data: z.record(z.string(), z.any()).optional()
});

export const RenewSubscriptionResponseSchema = z.object({
  message: z.string(),
  data: z.object({
    balance: z.any().optional(),
    subscriptionExpiresAt: z.any().optional()
  }).optional()
});

export const ListInvoicesQuerySchema = z.object({
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional()
});

export const ListInvoicesResponseSchema = z.object({
  message: z.string(),
  data: z.array(z.record(z.string(), z.any())),
  summary: z.record(z.string(), z.any()).optional(),
  meta: z.object({
    total: z.number(),
    currentPage: z.number(),
    lastPage: z.number(),
    perPage: z.number()
  }).optional()
});

export const GenericMessageSchema = z.object({
  message: z.string()
});
