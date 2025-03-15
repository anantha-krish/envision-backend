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

export const aggregatedNotifications = pgTable("aggregated_notifications", {
  id: serial("id").primaryKey(),
  ideaId: integer("idea_id").notNull(),
  type: text("type").notNull(),
  count: integer("count").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationActors = pgTable("notification_actors", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id")
    .notNull()
    .references(() => aggregatedNotifications.id, { onDelete: "cascade" }),
  actorId: integer("actor_id").notNull(), // Each user who engaged
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationRecipients = pgTable("notification_recipients", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id")
    .notNull()
    .references(() => aggregatedNotifications.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull(), // Recipient of the notification
  isRead: boolean("is_read").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});
