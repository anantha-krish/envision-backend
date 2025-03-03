import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user";
// Many-to-Many Relationship: Idea Approvers (Max 5 per idea)
export const ideaApprovers = pgTable("idea_approvers", {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    ideaId: uuid("idea_id").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").defaultNow(),
  });