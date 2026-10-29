import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function check() {
  const users = await sql`SELECT id, name, email, role_id FROM users`;
  console.table(users);
  await sql.end();
}

check();
