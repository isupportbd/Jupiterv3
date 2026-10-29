import fs from "node:fs";
import path from "node:path";
import { initDatabase, db } from "../src/framework/database/connection.js";
import { IngestionService } from "../src/modules/data-management/services/ingestion.service.js";

async function main() {
  const filePath = process.argv[2] || "1. Jan, 26 local_lc_report_(entry_date).csv";
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`Starting ingestion audit test for: ${resolvedPath}`);
  await initDatabase();

  const service = new IngestionService();
  const fileBuffer = fs.readFileSync(resolvedPath);
  const rows = await service.parseWorkbook(fileBuffer, path.basename(resolvedPath));

  console.log(`Parsed ${rows.length} total rows from file.`);
  const sample = rows[0];
  console.log("Sample row 0 BANK_NAME:", sample?.BANK_NAME || sample?.bank_name);
  console.log("Sample row 0 LC ID:", sample?.["LC ID"] || sample?.lc_id);
  console.log("Sample row 0 BENEFICIARY_NAME:", sample?.BENEFICIARY_NAME || sample?.beneficiary_name);

  // Ingest batch
  console.log("Ingesting batch into database with user_id: 1 (Admin)...");
  const result = await service.processBatch(rows, 1);
  console.log(`Ingestion Result: Inserted ${result.insertedCount}, Skipped ${result.skippedCount}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
