CREATE TABLE "aggregated_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"idea_id" integer NOT NULL,
	"type" text NOT NULL,
	"actor_ids" json DEFAULT '[]'::json,
	"count" integer DEFAULT 1,
	"is_read" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "individual_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"idea_id" integer NOT NULL,
	"actor_id" integer NOT NULL,
	"type" text NOT NULL,
	"message" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
