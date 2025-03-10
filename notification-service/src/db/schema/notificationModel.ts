import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  serial,
} from "drizzle-orm/pg-core";

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ideaId: integer("idea_id"),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
