import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  serial,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ENUM for Role-Based Access
export const userRoles = pgEnum("user_role", [
  "user",
  "poc_team",
  "manager",
  "approver",
  "admin",
]);

export type Roles = "user" | "poc_team" | "manager" | "approver" | "admin";
// Users Table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: userRoles("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});
