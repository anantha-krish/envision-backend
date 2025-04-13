import {
  integer,
  pgEnum,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  roleCode: varchar("role_code", { length: 50 }).notNull().unique(),
  roleName: varchar("role_name", { length: 100 }).notNull(),
});

export const designations = pgTable("designations", {
  id: serial("id").primaryKey(),
  designationCode: varchar("designation_code", { length: 50 })
    .notNull()
    .unique(),
  designationName: varchar("designation_name", { length: 100 }).notNull(),
});

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
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "restrict" }),
  designationId: integer("designation_id")
    .notNull()
    .references(() => designations.id, { onDelete: "restrict" }),
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
