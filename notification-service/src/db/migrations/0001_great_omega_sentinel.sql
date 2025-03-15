ALTER TABLE "aggregated_notifications" ALTER COLUMN "actor_ids" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "aggregated_notifications" ALTER COLUMN "actor_ids" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "aggregated_notifications" ALTER COLUMN "actor_ids" SET NOT NULL;