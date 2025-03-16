import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user";

// POC Teams Table (Each Idea can have only ONE POC team)
export const pocTeams = pgTable("poc_teams", {
  id: serial("id").primaryKey(),
  ideaId: integer("idea_id").unique(), // Can be NULL initially
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// POC Team Members Table (Many members can be in a team, and a user can be in multiple teams)
export const pocTeamMembers = pgTable("poc_team_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Ensuring user exists
  teamId: integer("team_id")
    .notNull()
    .references(() => pocTeams.id, { onDelete: "cascade" }), // Linking to POC team
  role: varchar("role", { length: 50 }).default("member"), // Role within the team (optional)
  createdAt: timestamp("created_at").defaultNow(),
});
