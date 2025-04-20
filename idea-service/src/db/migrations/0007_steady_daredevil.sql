ALTER TABLE "poc_teams" DROP CONSTRAINT "poc_teams_idea_id_ideas_id_fk";
--> statement-breakpoint
ALTER TABLE "poc_teams" ALTER COLUMN "idea_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "poc_teams" ADD CONSTRAINT "poc_teams_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE no action ON UPDATE no action;