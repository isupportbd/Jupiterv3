import { eq } from "drizzle-orm";
import { db } from "@/framework/facade.js";
import { billingSettings } from "@/modules/settings/database/models/setting.js";

export const table = billingSettings;

export default async function SettingSeeder() {
  const existing = await db.query.billingSettings.findFirst();
  if (!existing) {
    await db.insert(billingSettings).values({
      monthlyFee: "2000.00",
      paymentMethod: "bKash / Nagad",
      accountNo: "01700000000",
      activationDate: new Date().toISOString().slice(0, 10),
      status: "active"
    });
  }

  console.log("Billing settings seeder completed");
}
