import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";

// Approvers Table (Approvers can be assigned to multiple ideas)
export const ideaApprovers = pgTable("idea_approvers", {
  id: serial("id").primaryKey(),
  ideaId: integer("idea_id").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
});
