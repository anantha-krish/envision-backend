import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  serial,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user";

// Teams Table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Many-to-Many Relationship Table: user_team (Tracks which users belong to which teams)
export const userTeam = pgTable("user_team", {
  id: serial("id").primaryKey(),
  userId: serial("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  teamId: serial("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  roleInTeam: varchar("role_in_team", { length: 100 }).default("member"), // Optional: Role within the team
});
