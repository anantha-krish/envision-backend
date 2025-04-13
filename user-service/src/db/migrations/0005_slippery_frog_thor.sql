ALTER TABLE "designations" RENAME COLUMN "name" TO "designation_code";--> statement-breakpoint
ALTER TABLE "roles" RENAME COLUMN "name" TO "role_name";--> statement-breakpoint
ALTER TABLE "designations" DROP CONSTRAINT "designations_name_unique";--> statement-breakpoint
ALTER TABLE "roles" DROP CONSTRAINT "roles_name_unique";--> statement-breakpoint
ALTER TABLE "designations" ADD COLUMN "designation_name" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "roles" ADD COLUMN "role_code" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "designations" ADD CONSTRAINT "designations_designation_code_unique" UNIQUE("designation_code");--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_role_code_unique" UNIQUE("role_code");