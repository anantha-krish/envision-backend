ALTER TABLE "user_profiles" ALTER COLUMN "role" SET DEFAULT 'USER';--> statement-breakpoint
ALTER TABLE "public"."user_profiles" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'POC_TEAM', 'MANAGER', 'APPROVER', 'ADMIN');--> statement-breakpoint
ALTER TABLE "public"."user_profiles" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";