import { eq } from "drizzle-orm";
import { db, password } from "@/framework/facade.js";
import { roles } from "@/modules/auth/database/models/role.js";
import { users } from "@/modules/auth/database/models/user.js";

export const table = users;
export default async function UserSeeder() {
  const superAdminRole = await db.query.roles.findFirst({ where: eq(roles.name, "super_admin") });
  const adminRole = await db.query.roles.findFirst({ where: eq(roles.name, "admin") });
  const userRole = await db.query.roles.findFirst({ where: eq(roles.name, "user") });

  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123@";
  const adminName = process.env.ADMIN_NAME || "Super Admin";

  const rows = [
    {
      name: adminName,
      email: adminEmail,
      password: await password.hashPassword(adminPassword),
      roleId: superAdminRole?.id ?? null,
      status: "active",
      approvedAt: new Date()
    }
  ];

  for (const row of rows) {
    const existing = await db.query.users.findFirst({ where: eq(users.email, row.email) });
    if (!existing) {
      await db.insert(users).values(row);
    }
  }

  console.log("User seeder completed");
}
