import {
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ENUM for Role-Based Access
export const userRoles = pgEnum("user_role", [
  "USER",
  "POC_TEAM",
  "MANAGER",
  "APPROVER",
  "ADMIN",
]);

export const designationEnum = pgEnum("designation", [
  "MANAGER",
  "ARCHITECT",
  "LEAD",
  "BUSINESS ANALYST",
  "SENIOR ENGINEER",
  "ENGINEER",
]);

export type Roles = (typeof userRoles.enumValues)[number];
export type Designations = (typeof designationEnum.enumValues)[number];
// Users Table

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(), // Authentication only
  createdAt: timestamp("created_at").defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: userRoles("role").default(userRoles.enumValues[0]), // Enum for role
  designation: designationEnum("designation")
    .notNull()
    .default(designationEnum.enumValues[5]), // Enum for designation
});
export const userManagers = pgTable("user_managers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Employee
  managerId: integer("manager_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Manager
  assignedAt: timestamp("assigned_at").defaultNow(),
});
