CREATE TABLE "payment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"trx_id" varchar(100) NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by" integer,
	CONSTRAINT "payment_history_trx_id_unique" UNIQUE("trx_id")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "admin_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;