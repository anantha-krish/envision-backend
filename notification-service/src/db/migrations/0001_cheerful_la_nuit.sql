ALTER TABLE "notification_actors" RENAME COLUMN "notification_id" TO "agg_notification_id";--> statement-breakpoint
ALTER TABLE "notification_recipients" RENAME COLUMN "notification_id" TO "agg_notification_id";--> statement-breakpoint
ALTER TABLE "notification_actors" DROP CONSTRAINT "notification_actors_notification_id_aggregated_notifications_id_fk";
--> statement-breakpoint
ALTER TABLE "notification_recipients" DROP CONSTRAINT "notification_recipients_notification_id_aggregated_notifications_id_fk";
--> statement-breakpoint
ALTER TABLE "notification_actors" ADD CONSTRAINT "notification_actors_agg_notification_id_aggregated_notifications_id_fk" FOREIGN KEY ("agg_notification_id") REFERENCES "public"."aggregated_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_agg_notification_id_aggregated_notifications_id_fk" FOREIGN KEY ("agg_notification_id") REFERENCES "public"."aggregated_notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_recipients" DROP COLUMN "updated_at";