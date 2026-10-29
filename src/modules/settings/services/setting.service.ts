import { and, desc, eq, sql } from "drizzle-orm";
import { broadcast, db, paginate } from "@/framework/facade.js";
import { isSuperAdmin } from "@/modules/auth/controllers/auth.helpers.js";
import { users } from "@/modules/auth/database/models/user.js";
import { paymentHistory } from "@/modules/settings/database/models/payment.js";
import { billingSettings } from "@/modules/settings/database/models/setting.js";
import { walletTransactions } from "@/modules/settings/database/models/wallet.js";

export class SettingService {
  /**
   * Fetches active plans and billing configuration.
   */
  static async getBillingSettings() {
    const plans = await db
      .select()
      .from(billingSettings)
      .orderBy(desc(billingSettings.id));

    const activePlan = plans.find((p) => p.status === "active") || plans[0] || null;

    return {
      monthlyFee: activePlan ? String(activePlan.monthlyFee) : "2000",
      paymentInstructions: activePlan ? `${activePlan.paymentMethod}: ${activePlan.accountNo}` : "bKash: 01700000000",
      plans: plans.map((p) => ({
        id: p.id,
        monthlyFee: p.monthlyFee,
        paymentMethod: p.paymentMethod,
        accountNo: p.accountNo,
        activationDate: p.activationDate,
        status: p.status
      }))
    };
  }

  /**
   * Updates, activates, or deletes plans in billing_settings.
   */
  static async updateBillingSettings(body: any) {
    // 1. Delete plan by ID
    if (body.deleteId) {
      await db.delete(billingSettings).where(eq(billingSettings.id, Number(body.deleteId)));
    }
    // 2. Add new plan (automatically freezes all previous plans)
    else if (body.monthlyFee && body.paymentMethod && body.accountNo && body.activationDate) {
      await db
        .update(billingSettings)
        .set({ status: "frozen", updatedAt: new Date() })
        .where(eq(billingSettings.status, "active"));

      await db
        .insert(billingSettings)
        .values({
          monthlyFee: String(body.monthlyFee),
          paymentMethod: String(body.paymentMethod).trim(),
          accountNo: String(body.accountNo).trim(),
          activationDate: String(body.activationDate),
          status: "active"
        });
    }
    // 3. Batch update / sync plans
    else if (Array.isArray(body.plans)) {
      for (const p of body.plans) {
        if (p.id && Number(p.id) < 1000000000) {
          await db
            .update(billingSettings)
            .set({
              monthlyFee: String(p.monthlyFee),
              paymentMethod: p.paymentMethod,
              accountNo: p.accountNo,
              activationDate: p.activationDate,
              status: p.status,
              updatedAt: new Date()
            })
            .where(eq(billingSettings.id, Number(p.id)));
        } else {
          await db.insert(billingSettings).values({
            monthlyFee: String(p.monthlyFee),
            paymentMethod: p.paymentMethod,
            accountNo: p.accountNo,
            activationDate: p.activationDate,
            status: p.status || "inactive"
          });
        }
      }
    }

    const updatedPlans = await db
      .select()
      .from(billingSettings)
      .orderBy(desc(billingSettings.id));

    const active = updatedPlans.find((p) => p.status === "active") || updatedPlans[0] || null;

    return {
      monthlyFee: active ? String(active.monthlyFee) : "2000",
      paymentInstructions: active ? `${active.paymentMethod}: ${active.accountNo}` : "bKash: 01700000000",
      plans: updatedPlans
    };
  }

  /**
   * Submits a subscription payment detail and broadcasts event.
   */
  static async submitPayment(adminId: number, data: { amount: string; trxId: string; paymentMethod: string; notes?: string }) {
    const existing = await db.query.paymentHistory.findFirst({
      where: eq(paymentHistory.trxId, data.trxId)
    });

    if (existing) {
      throw new Error("This TrxID has already been submitted.");
    }

    const [inserted] = await db
      .insert(paymentHistory)
      .values({
        adminId,
        amount: data.amount,
        trxId: data.trxId,
        paymentMethod: data.paymentMethod,
        status: "pending",
        notes: data.notes || null,
        submittedAt: new Date()
      })
      .returning();

    // Broadcast realtime event via framework facade
    broadcast(
      "payment:submitted",
      {
        id: inserted.id,
        adminId: inserted.adminId,
        amount: inserted.amount,
        trxId: inserted.trxId,
        paymentMethod: inserted.paymentMethod,
        status: inserted.status,
        notes: inserted.notes,
        submittedAt: inserted.submittedAt
      },
      { all: true }
    );

    return inserted;
  }

  /**
   * Lists payments using framework pagination facade.
   */
  static async listPayments(c: any, auth: any, filter: { status?: string; search?: string }) {
    const isSuper = isSuperAdmin(auth.role);
    const conditions: any[] = [];

    if (!isSuper) {
      conditions.push(sql`${paymentHistory.adminId} = ${Number(auth.id)}`);
    }
    if (filter.status && filter.status !== "all") {
      conditions.push(sql`${paymentHistory.status} = ${filter.status}`);
    }
    if (filter.search) {
      const term = `%${filter.search}%`;
      conditions.push(
        sql`(${paymentHistory.trxId} ILIKE ${term} OR ${users.name} ILIKE ${term} OR ${users.email} ILIKE ${term} OR ${paymentHistory.paymentMethod} ILIKE ${term})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : sql`1=1`;

    const query = db
      .select({
        id: paymentHistory.id,
        adminId: paymentHistory.adminId,
        adminName: users.name,
        adminEmail: users.email,
        adminPhone: users.phone,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
        walletBalance: users.walletBalance,
        amount: paymentHistory.amount,
        trxId: paymentHistory.trxId,
        paymentMethod: paymentHistory.paymentMethod,
        status: paymentHistory.status,
        notes: paymentHistory.notes,
        submittedAt: paymentHistory.submittedAt,
        approvedAt: paymentHistory.approvedAt
      })
      .from(paymentHistory)
      .leftJoin(users, eq(paymentHistory.adminId, users.id))
      .where(whereClause)
      .orderBy(desc(paymentHistory.submittedAt));

    return paginate(c, query);
  }

  /**
   * Approves payment, recharges wallet, auto-deducts if subscription expired.
   */
  static async approvePayment(paymentId: number, approvedByAdminId: number) {
    let result: any;

    await db.transaction(async (tx) => {
      const payment = await tx.query.paymentHistory.findFirst({
        where: eq(paymentHistory.id, paymentId)
      });

      if (!payment) {
        throw { status: 404, message: "Payment record not found" };
      }
      if (payment.status !== "pending") {
        throw {
          status: 409,
          message: `Only pending payments can be approved. Current status is '${payment.status}'.`
        };
      }

      const adminUser = await tx.query.users.findFirst({
        where: eq(users.id, payment.adminId)
      });

      if (!adminUser) {
        throw { status: 404, message: "Associated office admin not found" };
      }

      const rechargeAmount = Number(payment.amount);
      const prevBalance = Number(adminUser.walletBalance || 0);
      const balanceAfterRecharge = prevBalance + rechargeAmount;

      // Log recharge transaction
      await tx.insert(walletTransactions).values({
        adminId: adminUser.id,
        type: "recharge",
        amount: String(rechargeAmount),
        balanceAfter: balanceAfterRecharge.toFixed(2),
        description: `Wallet recharge approved (${payment.paymentMethod}, TrxID: ${payment.trxId})`,
        referenceId: payment.trxId
      });

      // Check if subscription is expired and balance allows auto-renewal
      const isExpired = !adminUser.subscriptionExpiresAt || new Date(adminUser.subscriptionExpiresAt) <= new Date();
      const plans = await tx.select().from(billingSettings).orderBy(desc(billingSettings.id));
      const activePlan = plans.find((p) => p.status === "active") || plans[0] || null;
      const monthlyFee = Number(activePlan ? activePlan.monthlyFee : 3000);

      let finalBalance = balanceAfterRecharge;
      let newExpiry = adminUser.subscriptionExpiresAt;
      let autoDeducted = false;

      if (isExpired && balanceAfterRecharge >= monthlyFee) {
        finalBalance = balanceAfterRecharge - monthlyFee;
        const baseDate = new Date();
        newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        autoDeducted = true;

        // Log deduction transaction
        await tx.insert(walletTransactions).values({
          adminId: adminUser.id,
          type: "deduction",
          amount: String(monthlyFee),
          balanceAfter: finalBalance.toFixed(2),
          description: "Monthly subscription auto-deduction (30 Days extended)",
          referenceId: `AUTO-${payment.trxId}`
        });
      }

      // Update payment and user record
      const [updatedPayment] = await tx
        .update(paymentHistory)
        .set({
          status: "approved",
          approvedAt: new Date(),
          approvedBy: approvedByAdminId
        })
        .where(eq(paymentHistory.id, paymentId))
        .returning();

      await tx
        .update(users)
        .set({
          walletBalance: finalBalance.toFixed(2),
          ...(newExpiry ? { subscriptionExpiresAt: newExpiry, status: "active" } : {}),
          updatedAt: new Date()
        })
        .where(eq(users.id, adminUser.id));

      result = {
        autoDeducted,
        rechargeAmount,
        monthlyFee,
        updatedPayment,
        finalBalance,
        newExpiry,
        adminUserId: adminUser.id
      };
    });

    broadcast(
      "payment:approved",
      {
        id: result.updatedPayment.id,
        adminId: result.adminUserId,
        payment: result.updatedPayment,
        walletBalance: result.finalBalance,
        subscriptionExpiresAt: result.newExpiry
      },
      { all: true }
    );

    return result;
  }

  /**
   * Retrieves wallet balance and transaction summary for an office admin.
   */
  static async getWalletInfo(adminId: number) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, adminId)
    });

    if (!user) {
      throw { status: 404, message: "User not found" };
    }

    const plans = await db
      .select()
      .from(billingSettings)
      .orderBy(desc(billingSettings.id));
    const activePlan = plans.find((p) => p.status === "active") || plans[0] || null;
    const monthlyFee = Number(activePlan ? activePlan.monthlyFee : 3000);

    const transactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.adminId, adminId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(20);

    const balance = Number(user.walletBalance || 0);
    const isExpired = !user.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) <= new Date();

    return {
      balance,
      monthlyFee,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      isExpired,
      canRenew: balance >= monthlyFee,
      transactions
    };
  }

  /**
   * Manually renews subscription from wallet balance.
   */
  static async renewSubscriptionFromWallet(adminId: number) {
    let result: any;

    await db.transaction(async (tx) => {
      const user = await tx.query.users.findFirst({
        where: eq(users.id, adminId)
      });

      if (!user) {
        throw { status: 404, message: "User not found" };
      }

      const plans = await tx
        .select()
        .from(billingSettings)
        .orderBy(desc(billingSettings.id));
      const activePlan = plans.find((p) => p.status === "active") || plans[0] || null;
      const monthlyFee = Number(activePlan ? activePlan.monthlyFee : 3000);
      const currentBalance = Number(user.walletBalance || 0);

      if (currentBalance < monthlyFee) {
        throw {
          status: 422,
          message: `Insufficient balance (BDT ${currentBalance.toLocaleString()}). BDT ${monthlyFee.toLocaleString()} required. Please recharge your wallet.`
        };
      }

      const newBalance = (currentBalance - monthlyFee).toFixed(2);
      const baseDate = user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date()
        ? new Date(user.subscriptionExpiresAt)
        : new Date();
      const newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Update user balance and expiry
      await tx
        .update(users)
        .set({
          walletBalance: newBalance,
          subscriptionExpiresAt: newExpiry,
          status: "active",
          updatedAt: new Date()
        })
        .where(eq(users.id, adminId));

      // Log deduction transaction
      await tx.insert(walletTransactions).values({
        adminId,
        type: "deduction",
        amount: String(monthlyFee),
        balanceAfter: newBalance,
        description: "Monthly subscription deduction (30 Days extended)",
        referenceId: `SUB-${Date.now()}`
      });

      result = {
        balance: Number(newBalance),
        subscriptionExpiresAt: newExpiry,
        monthlyFee
      };
    });

    return result;
  }

  /**
   * Rejects an invalid payment.
   */
  static async rejectPayment(paymentId: number) {
    const payment = await db.query.paymentHistory.findFirst({
      where: eq(paymentHistory.id, paymentId)
    });

    if (!payment) {
      throw { status: 404, message: "Payment record not found" };
    }
    if (payment.status !== "pending") {
      throw {
        status: 409,
        message: `Only pending payments can be rejected. Current status is '${payment.status}'.`
      };
    }

    const [updated] = await db
      .update(paymentHistory)
      .set({ status: "rejected" })
      .where(eq(paymentHistory.id, paymentId))
      .returning();

    broadcast(
      "payment:rejected",
      {
        id: updated.id,
        adminId: payment.adminId,
        payment: updated
      },
      { all: true }
    );

    return updated;
  }

  /**
   * Lists deduction invoices and statements via framework pagination.
   */
  static async listInvoices(c: any, auth: any, search?: string) {
    const isSuper = isSuperAdmin(auth.role);
    const conditions: any[] = [
      eq(walletTransactions.type, "deduction")
    ];

    if (!isSuper) {
      conditions.push(eq(walletTransactions.adminId, Number(auth.id)));
    }

    if (search) {
      const term = `%${search}%`;
      conditions.push(
        sql`(${walletTransactions.referenceId} ILIKE ${term} OR ${walletTransactions.description} ILIKE ${term} OR ${users.name} ILIKE ${term} OR ${users.email} ILIKE ${term})`
      );
    }

    const whereClause = and(...conditions);

    const query = db
      .select({
        id: walletTransactions.id,
        adminId: walletTransactions.adminId,
        adminName: users.name,
        adminEmail: users.email,
        type: walletTransactions.type,
        amount: walletTransactions.amount,
        balanceAfter: walletTransactions.balanceAfter,
        description: walletTransactions.description,
        referenceId: walletTransactions.referenceId,
        createdAt: walletTransactions.createdAt,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
        currentWalletBalance: users.walletBalance
      })
      .from(walletTransactions)
      .leftJoin(users, eq(walletTransactions.adminId, users.id))
      .where(whereClause)
      .orderBy(desc(walletTransactions.createdAt));

    const result = await paginate(c, query);

    const user = await db.query.users.findFirst({
      where: eq(users.id, Number(auth.id))
    });

    return {
      result,
      summary: {
        walletBalance: Number(user?.walletBalance || 0),
        subscriptionExpiresAt: user?.subscriptionExpiresAt || null
      }
    };
  }
}
