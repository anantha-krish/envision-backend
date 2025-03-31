ALTER TABLE "ideas" ALTER COLUMN "views" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "likes_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ideas" ADD COLUMN "comments_count" integer DEFAULT 0 NOT NULL;