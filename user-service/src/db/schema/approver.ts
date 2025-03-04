import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";
// Many-to-Many Relationship: Idea Approvers (Max 5 per idea)
export const ideaApprovers = pgTable("idea_approvers", {
  id: serial("id").primaryKey(),
  ideaId: serial("idea_id").notNull(),
  userId: serial("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
});
