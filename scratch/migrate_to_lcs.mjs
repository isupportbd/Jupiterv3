import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const sql = postgres(connectionString);

async function run() {
  console.log("Starting migration to lcs master table and clean lc_records...");

  // 1. Create lcs table if not exists
  await sql`
    CREATE TABLE IF NOT EXISTS lcs (
      id BIGSERIAL PRIMARY KEY,
      lc_id VARCHAR(100) NOT NULL UNIQUE,
      lc_year VARCHAR(10),
      lc_value NUMERIC(15, 2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      lc_date TIMESTAMPTZ,
      lc_expiry_date TIMESTAMPTZ,
      opening_bank_id INTEGER REFERENCES banks(id) ON UPDATE CASCADE ON DELETE SET NULL,
      opening_branch_id INTEGER REFERENCES branches(id) ON UPDATE CASCADE ON DELETE SET NULL,
      beneficiary_bank_id INTEGER REFERENCES banks(id) ON UPDATE CASCADE ON DELETE SET NULL,
      beneficiary_branch_id INTEGER REFERENCES branches(id) ON UPDATE CASCADE ON DELETE SET NULL,
      nature_id INTEGER REFERENCES lc_natures(id) ON UPDATE CASCADE ON DELETE SET NULL,
      exporter_id INTEGER REFERENCES exporters(id) ON UPDATE CASCADE ON DELETE SET NULL,
      beneficiary_id INTEGER REFERENCES beneficiaries(id) ON UPDATE CASCADE ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log("Table 'lcs' created or verified.");

  // Check if lc_records has existing data to migrate
  const existingCount = await sql`SELECT count(*)::int as cnt FROM lc_records`;
  console.log("Existing lc_records count:", existingCount[0].cnt);

  if (existingCount[0].cnt > 0) {
    // If lc_records has old schema with lc_id, populate lcs from it
    const hasOldLcId = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lc_records' AND column_name = 'lc_id'
    `;

    if (hasOldLcId.length > 0) {
      console.log("Migrating unique LCs into 'lcs' table...");
      await sql`
        INSERT INTO lcs (
          lc_id, lc_year, lc_value, currency, lc_date, lc_expiry_date,
          opening_bank_id, opening_branch_id, beneficiary_bank_id, beneficiary_branch_id,
          nature_id, exporter_id, beneficiary_id
        )
        SELECT DISTINCT ON (lc_id)
          lc_id, lc_year, lc_value, currency, lc_date, lc_expiry_date,
          opening_bank_id, opening_branch_id, beneficiary_bank_id, beneficiary_branch_id,
          nature_id, exporter_id, beneficiary_id
        FROM lc_records
        ON CONFLICT (lc_id) DO NOTHING;
      `;
    }
  }

  // Check if lc_records needs schema restructuring:
  // Add lc_master_id if not present
  const hasMasterId = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'lc_records' AND column_name = 'lc_master_id'
  `;

  if (hasMasterId.length === 0) {
    console.log("Adding lc_master_id to lc_records...");
    await sql`
      ALTER TABLE lc_records 
      ADD COLUMN lc_master_id BIGINT REFERENCES lcs(id) ON UPDATE CASCADE ON DELETE CASCADE;
    `;

    // Populate lc_master_id
    await sql`
      UPDATE lc_records r
      SET lc_master_id = l.id
      FROM lcs l
      WHERE r.lc_id = l.lc_id;
    `;

    // Drop old foreign keys and redundant columns from lc_records
    console.log("Dropping redundant columns and old foreign keys from lc_records...");
    await sql`
      ALTER TABLE lc_records
        DROP COLUMN IF EXISTS lc_nature,
        DROP COLUMN IF EXISTS lc_id,
        DROP COLUMN IF EXISTS lc_year,
        DROP COLUMN IF EXISTS lc_value,
        DROP COLUMN IF EXISTS currency,
        DROP COLUMN IF EXISTS lc_date,
        DROP COLUMN IF EXISTS lc_expiry_date,
        DROP COLUMN IF EXISTS opening_bank_id,
        DROP COLUMN IF EXISTS opening_branch_id,
        DROP COLUMN IF EXISTS beneficiary_bank_id,
        DROP COLUMN IF EXISTS beneficiary_branch_id,
        DROP COLUMN IF EXISTS nature_id,
        DROP COLUMN IF EXISTS exporter_id,
        DROP COLUMN IF EXISTS beneficiary_id;
    `;
  } else {
    // If lc_master_id already exists, ensure redundant columns are dropped
    await sql`
      ALTER TABLE lc_records
        DROP COLUMN IF EXISTS lc_nature,
        DROP COLUMN IF EXISTS lc_id,
        DROP COLUMN IF EXISTS lc_year,
        DROP COLUMN IF EXISTS lc_value,
        DROP COLUMN IF EXISTS currency,
        DROP COLUMN IF EXISTS lc_date,
        DROP COLUMN IF EXISTS lc_expiry_date,
        DROP COLUMN IF EXISTS opening_bank_id,
        DROP COLUMN IF EXISTS opening_branch_id,
        DROP COLUMN IF EXISTS beneficiary_bank_id,
        DROP COLUMN IF EXISTS beneficiary_branch_id,
        DROP COLUMN IF EXISTS nature_id,
        DROP COLUMN IF EXISTS exporter_id,
        DROP COLUMN IF EXISTS beneficiary_id;
    `;
  }

  console.log("Migration completed successfully!");
  await sql.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
