import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  json,
} from "drizzle-orm/pg-core";

// Individual notifications (for comments, direct engagements)
export const individualNotifications = pgTable("individual_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Who should see this notification
  ideaId: integer("idea_id").notNull(),
  actorId: integer("actor_id").notNull(), // Who triggered the event
  type: text("type").notNull(), // "like" or "comment"
  message: text("message"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Aggregated notifications (for grouped likes/comments)
export const aggregatedNotifications = pgTable("aggregated_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ideaId: integer("idea_id").notNull(),
  type: text("type").notNull(), // "like" or "comment"
  actorIds: text("actor_ids").array().notNull().default([]), // Array of user IDs who liked/commented
  count: integer("count").default(1), // Count of likes/comments
  isRead: boolean("is_read").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});
