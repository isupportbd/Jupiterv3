import type { Handler } from "hono";
import { HttpStatusCodes } from "@/framework/facade.js";
import { SettingService } from "../services/setting.service.js";
import { SubmitPaymentSchema } from "../schemas/payment.schema.js";

/**
 * Why: Fetches monthly fee, payment instructions, and active plans.
 * Where: GET /api/settings/billing
 */
export const getBillingSettings: Handler = async (c: any) => {
  try {
    const data = await SettingService.getBillingSettings();
    return c.json(
      {
        message: "Billing settings fetched successfully",
        data
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Get billing settings error:", error);
    return c.json({ message: "Failed to fetch billing settings" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Creates, updates, activates, or deletes plans in billing_settings (SuperAdmin only).
 * Where: POST /api/settings/billing
 */
export const updateBillingSettings: Handler = async (c: any) => {
  try {
    const body = await c.req.json();
    const data = await SettingService.updateBillingSettings(body);
    return c.json(
      {
        message: "Billing settings and plans saved successfully.",
        data
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("Update billing settings error:", error);
    return c.json({ message: "Failed to update billing settings" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: Office Admin submits subscription payment details (TrxID).
 * Where: POST /api/settings/payments
 */
export const submitPayment: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const rawBody = await c.req.json();

    const parsed = SubmitPaymentSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json(
        {
          message: "Invalid payment submission details.",
          errors: parsed.error.flatten()
        },
        HttpStatusCodes.UNPROCESSABLE_ENTITY
      );
    }

    const { amount, trxId, paymentMethod, notes } = parsed.data;

    const inserted = await SettingService.submitPayment(Number(auth.id), {
      amount,
      trxId,
      paymentMethod,
      notes: notes || undefined
    });

    return c.json(
      {
        message: "Payment details submitted successfully. Subscription will activate upon SuperAdmin approval.",
        data: inserted
      },
      HttpStatusCodes.CREATED
    );
  } catch (error: any) {
    console.error("Submit payment error:", error);
    const message = error.message || "Failed to submit payment";
    const status = message.includes("already been submitted")
      ? HttpStatusCodes.UNPROCESSABLE_ENTITY
      : HttpStatusCodes.INTERNAL_SERVER_ERROR;
    return c.json({ message }, status);
  }
};

/**
 * Why: Lists payment transactions (SuperAdmin sees all, Admin sees own).
 * Where: GET /api/settings/payments
 */
export const listPayments: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const status = c.req.query("status"); // 'all' | 'pending' | 'approved' | 'rejected'
    const search = c.req.query("search")?.trim();

    const result = await SettingService.listPayments(c, auth, { status, search });

    return c.json(
      {
        message: "Payments fetched successfully",
        data: result.data,
        meta: {
          total: result.total,
          currentPage: result.current_page,
          lastPage: result.last_page,
          perPage: result.per_page
        }
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("List payments error:", error);
    return c.json({ message: "Failed to fetch payments" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Why: SuperAdmin approves a payment (recharge) and credits it to the office admin's wallet.
 * Where: POST /api/settings/payments/:id/approve
 */
export const approvePayment: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const id = Number(c.req.param("id"));

    const result = await SettingService.approvePayment(id, Number(auth.id));

    return c.json(
      {
        message: result.autoDeducted
          ? `Recharge of BDT ${result.rechargeAmount.toLocaleString()} approved. Monthly bill of BDT ${result.monthlyFee.toLocaleString()} auto-deducted and subscription extended by 30 days.`
          : `Recharge of BDT ${result.rechargeAmount.toLocaleString()} credited to office wallet successfully.`,
        data: {
          payment: result.updatedPayment,
          walletBalance: result.finalBalance,
          subscriptionExpiresAt: result.newExpiry
        }
      },
      HttpStatusCodes.OK
    );
  } catch (error: any) {
    console.error("Approve payment error:", error);
    const status = error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR;
    const message = error.message || "Failed to approve payment";
    return c.json({ message }, status);
  }
};

/**
 * Why: Gets current wallet balance, monthly fee, subscription status, and transaction history.
 * Where: GET /api/settings/wallet
 */
export const getWalletInfo: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const data = await SettingService.getWalletInfo(Number(auth.id));

    return c.json(
      {
        message: "Wallet info fetched successfully",
        data
      },
      HttpStatusCodes.OK
    );
  } catch (error: any) {
    console.error("Get wallet info error:", error);
    const status = error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR;
    const message = error.message || "Failed to fetch wallet info";
    return c.json({ message }, status);
  }
};

/**
 * Why: Office Admin manually renews subscription from wallet balance.
 * Where: POST /api/settings/wallet/renew
 */
export const renewSubscriptionFromWallet: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const result = await SettingService.renewSubscriptionFromWallet(Number(auth.id));

    return c.json(
      {
        message: `Subscription successfully renewed for 30 days! BDT ${result.monthlyFee.toLocaleString()} deducted from wallet.`,
        data: {
          balance: result.balance,
          subscriptionExpiresAt: result.subscriptionExpiresAt
        }
      },
      HttpStatusCodes.OK
    );
  } catch (error: any) {
    console.error("Renew from wallet error:", error);
    const status = error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR;
    const message = error.message || "Failed to renew subscription from wallet";
    return c.json({ message }, status);
  }
};

/**
 * Why: SuperAdmin rejects an invalid payment.
 * Where: POST /api/settings/payments/:id/reject
 */
export const rejectPayment: Handler = async (c: any) => {
  try {
    const id = Number(c.req.param("id"));
    const updated = await SettingService.rejectPayment(id);

    return c.json(
      {
        message: "Payment rejected successfully.",
        data: updated
      },
      HttpStatusCodes.OK
    );
  } catch (error: any) {
    console.error("Reject payment error:", error);
    const status = error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR;
    const message = error.message || "Failed to reject payment";
    return c.json({ message }, status);
  }
};

/**
 * Why: Lists monthly subscription deduction invoices and statements.
 * Where: GET /api/settings/invoices
 */
export const listInvoices: Handler = async (c: any) => {
  try {
    const auth = c.get("auth");
    const search = c.req.query("search")?.trim();

    const { result, summary } = await SettingService.listInvoices(c, auth, search);

    return c.json(
      {
        message: "Invoices fetched successfully",
        data: result.data,
        summary,
        meta: {
          total: result.total,
          currentPage: result.current_page,
          lastPage: result.last_page,
          perPage: result.per_page
        }
      },
      HttpStatusCodes.OK
    );
  } catch (error) {
    console.error("List invoices error:", error);
    return c.json({ message: "Failed to fetch invoices" }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};
