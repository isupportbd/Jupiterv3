CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "login_otp_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp" varchar(10) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "wallet_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"monthly_fee" numeric(12, 2) NOT NULL,
	"payment_method" varchar(100) NOT NULL,
	"account_no" varchar(100) NOT NULL,
	"activation_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"type" varchar(20) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"description" text NOT NULL,
	"reference_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "banks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "banks_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"bank_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"ads_code" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_branch_ads_idx" UNIQUE("bank_id","name","ads_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "beneficiaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beneficiaries_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exporters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exporters_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lc_natures" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lc_natures_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lcs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"lc_id" varchar(100) NOT NULL,
	"lc_year" varchar(10),
	"lc_value" numeric(15, 2) DEFAULT '0',
	"currency" varchar(10) DEFAULT 'USD',
	"lc_date" timestamp with time zone,
	"lc_expiry_date" timestamp with time zone,
	"opening_bank_id" integer,
	"opening_branch_id" integer,
	"beneficiary_bank_id" integer,
	"beneficiary_branch_id" integer,
	"nature_id" integer,
	"exporter_id" integer,
	"beneficiary_id" integer,
	"applicant_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lcs_lc_id_unique" UNIQUE("lc_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lc_records" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"lc_master_id" bigint NOT NULL,
	"lc_serial" varchar(50),
	"bb_usanse_period" varchar(100),
	"last_ship_date" timestamp with time zone,
	"pi_number" varchar(150),
	"pi_date" timestamp with time zone,
	"bond_license" varchar(150),
	"accepted" varchar(100),
	"cancel_yn" varchar(10) DEFAULT 'N',
	"cancel_cause" varchar(255),
	"entry_date" timestamp with time zone,
	"record_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lc_records_record_hash_unique" UNIQUE("record_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monthly_lc_summaries" (
	"month_key" varchar(7) PRIMARY KEY NOT NULL,
	"total_records" integer DEFAULT 0 NOT NULL,
	"total_lc_reg" integer DEFAULT 0 NOT NULL,
	"total_lc_unq" integer DEFAULT 0 NOT NULL,
	"total_ben_reg" integer DEFAULT 0 NOT NULL,
	"total_ben_unq" integer DEFAULT 0 NOT NULL,
	"total_bank_reg" integer DEFAULT 0 NOT NULL,
	"total_bank_unq" integer DEFAULT 0 NOT NULL,
	"total_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_beneficiaries_name_trgm" ON "beneficiaries" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_exporters_name_trgm" ON "exporters" USING gin ("name" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lcs_beneficiary_id" ON "lcs" USING btree ("beneficiary_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lcs_exporter_id" ON "lcs" USING btree ("exporter_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lcs_opening_bank_id" ON "lcs" USING btree ("opening_bank_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lcs_beneficiary_bank_id" ON "lcs" USING btree ("beneficiary_bank_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lcs_beneficiary_id_opening_bank_id" ON "lcs" USING btree ("beneficiary_id","opening_bank_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lc_records_lc_master_id" ON "lc_records" USING btree ("lc_master_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lc_records_entry_date" ON "lc_records" USING btree ("entry_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lc_records_entry_date_lc_master_id" ON "lc_records" USING btree ("entry_date","lc_master_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_lc_records_lc_master_id_entry_date" ON "lc_records" USING btree ("lc_master_id","entry_date");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "branches" ADD CONSTRAINT "branches_bank_id_banks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."banks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lcs" ADD CONSTRAINT "lcs_opening_bank_id_banks_id_fk" FOREIGN KEY ("opening_bank_id") REFERENCES "public"."banks"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lcs" ADD CONSTRAINT "lcs_opening_branch_id_branches_id_fk" FOREIGN KEY ("opening_branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lcs" ADD CONSTRAINT "lcs_beneficiary_bank_id_banks_id_fk" FOREIGN KEY ("beneficiary_bank_id") REFERENCES "public"."banks"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lcs" ADD CONSTRAINT "lcs_beneficiary_branch_id_branches_id_fk" FOREIGN KEY ("beneficiary_branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lcs" ADD CONSTRAINT "lcs_nature_id_lc_natures_id_fk" FOREIGN KEY ("nature_id") REFERENCES "public"."lc_natures"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lcs" ADD CONSTRAINT "lcs_exporter_id_exporters_id_fk" FOREIGN KEY ("exporter_id") REFERENCES "public"."exporters"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lcs" ADD CONSTRAINT "lcs_beneficiary_id_beneficiaries_id_fk" FOREIGN KEY ("beneficiary_id") REFERENCES "public"."beneficiaries"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lc_records" ADD CONSTRAINT "lc_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lc_records" ADD CONSTRAINT "lc_records_lc_master_id_lcs_id_fk" FOREIGN KEY ("lc_master_id") REFERENCES "public"."lcs"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
