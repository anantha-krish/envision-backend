import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const ideas = pgTable("ideas", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  summary: varchar("summary", { length: 500 }).notNull(),
  description: varchar("description").notNull(), // Stored in HTML format
  statusId: integer("status_id").notNull(),
  managerId: integer("manager_id"),
  views: integer("views").default(0), // Store total
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ideaStatus = pgTable("idea_status", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // e.g., "SUBMITTED", "APPROVED"
});

export const pocTeams = pgTable("poc_teams", {
  id: serial("id").primaryKey(),
  ideaId: integer("idea_id")
    .unique()
    .notNull()
    .references(() => ideas.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// POC Team Members Table (Many members can be in a team, and a user can be in multiple teams)
export const pocTeamMembers = pgTable("poc_team_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Ensuring user exists
  teamId: integer("team_id")
    .notNull()
    .references(() => pocTeams.id, { onDelete: "cascade" }), // Linking to POC team
  role: varchar("role", { length: 50 }).default("member"), // Role within the team (optional)
  createdAt: timestamp("created_at").defaultNow(),
});

export const ideaApprovers = pgTable("idea_approvers", {
  id: serial("id").primaryKey(),
  ideaId: integer("idea_id")
    .notNull()
    .references(() => ideas.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Tags Table
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
});

// Junction Table: Idea-Tags Relationship
export const ideaTags = pgTable("idea_tags", {
  ideaId: integer("idea_id")
    .references(() => ideas.id, { onDelete: "cascade" })
    .notNull(),
  tagId: integer("tag_id")
    .references(() => tags.id, { onDelete: "cascade" })
    .notNull(),
});
// Idea Submitters (Many-to-Many)
export const ideaSubmitters = pgTable("idea_submitters", {
  ideaId: integer("idea_id")
    .references(() => ideas.id, { onDelete: "cascade" })
    .notNull(),
  userId: integer("user_id").notNull(),
});
