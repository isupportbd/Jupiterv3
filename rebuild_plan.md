# Jupiter V3 - Master Rebuild Plan & Architectural Roadmap

**Date:** October 27, 2026  
**Project Directory:** `D:\Softwares\Apps Portal\Jupiter V3`  
**Database:** PostgreSQL (`postgres://postgres:postgres@localhost:5432/postgres`)  
**Runtime:** Node.js v24.12.0 (Strictly NO Bun, strictly NO MySQL)  
**Framework:** NextGen (Maker) on Hono + Vite/Vue 3  

---

## 1. Core Principles & Strict Constraints

1. **Rule of Completeness:**  
   Every module must be 100% completed across backend, frontend, database models, and automated tests before moving forward.
2. **Strictly 3 Roles:**  
   - `superadmin`: Platform Owner (`isupportbd.info@gmail.com`).
   - `admin`: Office Owner / Data Uploader (Only 1 active admin per office).
   - `user`: Office Staff / Read-only Analytics (8–10 staff per office).
   - ⚠️ `operator` role is permanently eliminated from code and database.
3. **SuperAdmin Boundaries:**  
   - Exactly 1 SuperAdmin in the entire system.
   - Manages office approvals, sets monthly subscription fees, approves TrxID payments, downloads live database dumps.
   - ⚠️ SuperAdmin has ZERO LC data and ZERO access to analytics reports.
4. **Office Admin Exclusivity:**  
   - Strictly 1 active admin per office.
   - Only the Office Admin can upload Bangladesh Bank data.
   - Manages up to 10 office staff accounts.
   - Transferring admin ownership automatically demotes the former admin to staff.
5. **Staff Access & Inheritance:**  
   - Read-only access to 3 dedicated reports:
     1. Monthwise Summary (`/reports/monthwise`)
     2. Local LC Report (`/reports/local-lc`)
     3. Beneficiary Analytics (`/reports/beneficiary`)
   - Staff accounts inherit validity from their parent Office Admin (402 Payment Required if expired).

---

## 2. Implementation Progress & Status

### Phase 1: Environment & PostgreSQL Migration [Completed - 100%]
- [x] Enforce Node.js v24 runtime (Bun eliminated).
- [x] Configure PostgreSQL connection pool on port 5432.
- [x] Start NextGen backend server (`http://localhost:3001`).
- [x] Start Vite UI development server (`http://localhost:5173`).
- [x] Connect Drizzle Studio (`https://local.drizzle.studio`).

### Phase 2: SuperAdmin & Platform Authentication Module [Completed - 100%]
- [x] Role Sanitization: Removed `operator`, normalized `superadmin`, `admin`, `user`.
- [x] SuperAdmin Account: Configured `isupportbd.info@gmail.com` with hashed password `Expw.17@`.
- [x] Office Registration & Approval Guard: Default `status = 'pending'`, unapproved access blocked (403).
- [x] SuperAdmin Office Controller: `/api/auth/admin/users` (list, approve, reject, extend subscription).
- [x] Monthly Fee & Billing Settings: `/api/settings/billing` (SuperAdmin configures fee and payment instructions).
- [x] Payment & TrxID Approvals: `/api/settings/payments` (Admin submits TrxID, SuperAdmin approval adds 30 days validity).
- [x] Database Storage Monitor & SQL Dumps: `/api/system/storage-size` and `/api/system/backup/download`.
- [x] Subscription Middleware: `src/middlewares/subscription-middleware.ts`.
- [x] Frontend Views:
  - Office Approvals (`/users`)
  - Billing Settings (`/settings/billing`)
  - Payment Approvals (`/settings/payments`)
  - Live Database Backup (`/system/backup`)
- [x] Role-Isolated Sidebar: SuperAdmin has zero data upload and zero LC reporting menus.

### Phase 3: Office Admin & Staff Delegation Module [Completed - 100%]
- [x] Office Staff Management Endpoints:
  - `GET /api/auth/staff`: Lists staff under current Office Admin.
  - `POST /api/auth/staff`: Creates staff accounts (`role = 'user'`, max 10 staff limit per office).
  - `POST /api/auth/staff/:id/password-reset`: Office Admin resets staff password.
  - `POST /api/auth/staff/:id/status`: Toggle staff active / suspended.
- [x] Single Admin Transfer Engine:
  - `POST /api/auth/staff/:id/transfer-admin` executed in an atomic database transaction.
  - Promotes target staff to `admin`, demotes former admin to `user`.
  - Reassigns remaining staff `adminId` to point to the new admin.
  - Strictly prevents assigning or modifying `superadmin`.
- [x] Staff Subscription Inheritance:
  - Enforced via `subscriptionMiddleware`.
  - Verified that staff access is blocked (402) when admin subscription expires, and restored upon payment approval.
- [x] Frontend Interface:
  - Enhanced `/users` with conditional Office Admin Staff Management & Delegation view.
  - Added Single Admin Transfer modal and status toggles.
  - Added avatar panel switcher in Header.

### Phase 4: Normalized Master-Child Database Architecture & Analytics [Completed - 100%]
- [x] Normalized 3NF Master-Child Database Architecture (Integer Foreign Keys):
  - `banks` master table (`id`, `name` unique).
  - `branches` master table (`id`, `bank_id` FK, `name`, `ads_code`).
  - `lc_natures` master table (`id`, `name` unique).
  - `exporters` master table (`id`, `name` unique, `code`) from `EXPORTER_INFO`.
  - `beneficiaries` master table (`id`, `name` unique, `address`).
  - `lcs` master contract table (`id`, `lc_id` unique text, `lc_year`, `opening_bank_id`, `opening_branch_id`, `beneficiary_bank_id`, `beneficiary_branch_id`, `nature_id`, `exporter_id`, `beneficiary_id`, `lc_value`, `currency`, `lc_date`, `lc_expiry_date`).
  - `lc_records` shipment & transaction table (`id`, `user_id`, `lc_master_id` FK -> `lcs.id`, `lc_serial`, `bb_usanse_period`, `last_ship_date`, `pi_number`, `pi_date`, `bond_license`, `accepted`, `cancel_yn`, `cancel_cause`, `entry_date`, `record_hash`).
  - `monthly_lc_summaries` pre-aggregated table for instant 0.1ms metrics.
- [x] Database Cleanup:
  - Permanently dropped 16 legacy/orphan unused tables (`bank_accounts`, `loans`, `customers`, `mfs_accounts`, `plans`, etc.).
  - Exactly 17 purposeful, active tables remain in PostgreSQL database `jupiter_v3`.
- [x] Ingestion Pipeline (`IngestionService`):
  - Automatic creation and linking of `lcs` master records and partial shipment `lc_records`.
  - Case-insensitive entity resolution and in-memory caching (`Map<string, number>`).
  - Cleans scientific notation (`1.94526E+12`), parses dates and Opening/Beneficiary Bank & Branch relations.
  - MD5 binary hash generation for shipment row deduplication.
  - Real-time recalculation of `monthly_lc_summaries`.
- [x] Dedicated Reporting System:
  1. `/reports/monthwise`: **Monthwise Summary Report** (Instant aggregated metrics, KPI cards, CSV export).
  2. `/reports/local-lc`: **Local LC Detailed Report** (Search, Year, Date filters, server pagination, Admin Ingestion Modal).
  3. `/reports/beneficiary`: **Beneficiary LC Transaction Report** (12-column tabular report, date ranges, multi-select beneficiary filter with Clear/OK, 25 records per page pagination, Excel export).
  4. `/reports/beneficiary-detail`: **Beneficiary 360° Profile Audit** (Interactive KPI cards, bank distribution, transaction ledger).
- [x] Verification & Integration Testing:
  - Verified with real user sample data (`2,057.00` and `502,844.00` LCs successfully ingested, linked, and queried).
  - Frontend compiled and bundled with 0 errors via Vite.

---

## 3. Active Services & Ports

| Service | Port / URL | Status |
| :--- | :--- | :--- |
| **Backend API (Hono)** | `http://localhost:3001` | Running (Task 751) |
| **Frontend UI (Vite/Vue)** | `http://localhost:5173` | Running (Task 518) |
| **Drizzle Studio** | `https://local.drizzle.studio` | Running (Task 304) |
| **PostgreSQL Database** | `localhost:5432/postgres` | Active |
| **Redis** | `redis://127.0.0.1:6379` | Active |
