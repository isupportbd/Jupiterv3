import { z } from "zod";

export const SubmitPaymentSchema = z.object({
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val.replace(/,/g, "").trim()) : val;
      return num;
    })
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Amount must be a positive number greater than 0."
    })
    .refine((val) => val <= 1_000_000, {
      message: "Amount cannot exceed 1,000,000 BDT."
    })
    .refine((val) => Number(val.toFixed(2)) === val || /^\d+(\.\d{1,2})?$/.test(String(val)), {
      message: "Amount cannot have more than 2 decimal places."
    })
    .transform((val) => val.toFixed(2)),

  trxId: z
    .string()
    .trim()
    .min(4, "Transaction ID must be at least 4 characters long.")
    .max(100, "Transaction ID cannot exceed 100 characters.")
    .regex(/^[A-Za-z0-9\-_]+$/, "Transaction ID must contain only alphanumeric characters, dashes, or underscores.")
    .transform((val) => val.toUpperCase()),

  paymentMethod: z
    .string()
    .trim()
    .min(2, "Payment method is required.")
    .max(50, "Payment method cannot exceed 50 characters."),

  notes: z
    .string()
    .trim()
    .max(500, "Notes cannot exceed 500 characters.")
    .optional()
    .nullable()
});

export type SubmitPaymentInput = z.infer<typeof SubmitPaymentSchema>;
