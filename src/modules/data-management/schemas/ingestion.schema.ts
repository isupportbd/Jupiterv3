import { z } from "zod";

/**
 * Validates individual ingestion record row payload.
 * Supports both snake_case and camelCase column aliases from Excel/CSV mappers.
 */
export const IngestionRowSchema = z
  .object({
    // Bank & Branch
    bankName: z.string().max(255).optional(),
    bank_name: z.string().max(255).optional(),
    BANK_NAME: z.string().max(255).optional(),

    branchName: z.string().max(255).optional(),
    branch_name: z.string().max(255).optional(),
    BRANCH_NAME: z.string().max(255).optional(),

    adsCode: z.string().max(50).optional(),
    ads_code: z.string().max(50).optional(),
    ADSCODE: z.string().max(50).optional(),

    // LC Master info
    lcId: z.string().max(100).optional(),
    lc_id: z.string().max(100).optional(),
    LC_ID: z.string().max(100).optional(),

    lcSerial: z.string().max(100).optional(),
    lc_serial: z.string().max(100).optional(),

    lcYear: z.string().max(20).optional(),
    lc_year: z.string().max(20).optional(),

    lcNature: z.string().max(100).optional(),
    lc_nature: z.string().max(100).optional(),

    // Numeric LC Value (accepts number or string)
    lcValue: z.union([z.number(), z.string().max(50)]).optional(),
    lc_value: z.union([z.number(), z.string().max(50)]).optional(),
    LC_VALUE: z.union([z.number(), z.string().max(50)]).optional(),

    currency: z.string().max(10).optional(),

    // Dates
    entryDate: z.union([z.string().max(50), z.date()]).optional(),
    entry_date: z.union([z.string().max(50), z.date()]).optional(),
    ENTRY_DATE: z.union([z.string().max(50), z.date()]).optional(),

    lcDate: z.union([z.string().max(50), z.date()]).optional(),
    lc_date: z.union([z.string().max(50), z.date()]).optional(),

    lcExpiryDate: z.union([z.string().max(50), z.date()]).optional(),
    lc_expiry_date: z.union([z.string().max(50), z.date()]).optional(),

    lastShipDate: z.union([z.string().max(50), z.date()]).optional(),
    last_ship_date: z.union([z.string().max(50), z.date()]).optional(),

    proceedsDate: z.union([z.string().max(50), z.date()]).optional(),
    proceeds_date: z.union([z.string().max(50), z.date()]).optional(),

    // Beneficiary & Exporter
    beneficiaryName: z.string().max(255).optional(),
    beneficiary_name: z.string().max(255).optional(),
    BENEFICIARY_NAME: z.string().max(255).optional(),

    beneficiaryBank: z.string().max(255).optional(),
    beneficiary_bank: z.string().max(255).optional(),

    beneficiaryBranch: z.string().max(255).optional(),
    beneficiary_branch: z.string().max(255).optional(),

    exporterName: z.string().max(255).optional(),
    exporter_name: z.string().max(255).optional(),
    EXPORTER_NAME: z.string().max(255).optional(),

    exporterInfo: z.string().max(500).optional(),
    exporter_info: z.string().max(500).optional(),

    applicantName: z.string().max(255).optional(),
    applicant_name: z.string().max(255).optional(),

    // Other fields
    bondLicense: z.string().max(100).optional(),
    bond_license: z.string().max(100).optional(),

    exportLcNumber: z.string().max(100).optional(),
    export_lc_number: z.string().max(100).optional(),

    piNumber: z.string().max(100).optional(),
    pi_number: z.string().max(100).optional(),

    piDate: z.union([z.string().max(50), z.date()]).optional(),
    pi_date: z.union([z.string().max(50), z.date()]).optional(),

    accepted: z.string().max(20).optional(),
    cancelYn: z.string().max(10).optional(),
    cancel_yn: z.string().max(10).optional(),
    cancelCause: z.string().max(255).optional(),
    cancel_cause: z.string().max(255).optional(),
  })
  .passthrough()
  .refine(
    (row) => {
      const bank = row.bankName || row.bank_name || row.BANK_NAME;
      return typeof bank === "string" && bank.trim().length > 0;
    },
    { message: "Row must contain a non-empty bank name." }
  )
  .refine(
    (row) => {
      const entry = row.entryDate || row.entry_date || row.ENTRY_DATE;
      return entry !== undefined && entry !== null && entry !== "";
    },
    { message: "Row must contain an entry date." }
  );

/**
 * Validates the batch upload request body.
 * Enforces array shape and bounded row count (1 to 10,000 rows).
 */
export const BatchUploadSchema = z.union([
  z.array(IngestionRowSchema).min(1, "Batch cannot be empty").max(10000, "Batch cannot exceed 10,000 rows per request"),
  z.object({
    rows: z.array(IngestionRowSchema).min(1, "Batch cannot be empty").max(10000, "Batch cannot exceed 10,000 rows per request")
  }).transform((val) => val.rows)
]);

export type IngestionRow = z.infer<typeof IngestionRowSchema>;
