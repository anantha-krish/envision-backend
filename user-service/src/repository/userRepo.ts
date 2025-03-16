import { eq } from "drizzle-orm";
import { db } from "../db/db.connection";
import {
  users,
  userProfiles,
  userManagers,
  Roles,
  Designations,
} from "../db/schema";

class UserRepository {
  // 🔹 Fetch All Users with Profiles & Manager Info
  async getAllUsers() {
    return db
      .select({
        user_id: users.id,
        username: users.username,
        email: users.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        role: userProfiles.role,
        designation: userProfiles.designation,
        managerId: userManagers.managerId,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(userManagers, eq(users.id, userManagers.userId));
  }

  // 🔹 Get User by ID (With Profile & Manager)
  async getUserById(id: number) {
    return db
      .select({
        user_id: users.id,
        username: users.username,
        email: users.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        role: userProfiles.role,
        designation: userProfiles.designation,
        managerId: userManagers.managerId,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(userManagers, eq(users.id, userManagers.userId))
      .where(eq(users.id, id));
  }

  // 🔹 Create User with Profile
  async createUser(
    username: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: Roles,
    designation: Designations,
    managerId?: number // Optional manager assignment
  ) {
    return db.transaction(async (tx) => {
      // Insert into `users`
      const newUser = await tx
        .insert(users)
        .values({ username, email, password })
        .returning({ id: users.id });

      const userId = newUser[0].id;

      // Insert into `user_profiles`
      await tx.insert(userProfiles).values({
        userId,
        firstName,
        lastName,
        role,
        designation,
      });

      // If manager is assigned, insert into `user_managers`
      if (managerId) {
        await tx.insert(userManagers).values({ userId, managerId });
      }

      return {
        userId,
        username,
        email,
        firstName,
        lastName,
        role,
        designation,
        managerId,
      };
    });
  }

  // 🔹 Update User & Profile
  async updateUser(
    id: number,
    username?: string,
    email?: string,
    firstName?: string,
    lastName?: string,
    role?: Roles,
    designation?: Designations,
    managerId?: number
  ) {
    return db.transaction(async (tx) => {
      const updateUserFields: Partial<{ username: string; email: string }> = {};
      const updateProfileFields: Partial<{
        firstName: string;
        lastName: string;
        role: Roles;
        designation: Designations;
      }> = {};

      if (username) updateUserFields.username = username;
      if (email) updateUserFields.email = email;
      if (firstName) updateProfileFields.firstName = firstName;
      if (lastName) updateProfileFields.lastName = lastName;
      if (role) updateProfileFields.role = role;
      if (designation) updateProfileFields.designation = designation;

      if (Object.keys(updateUserFields).length > 0) {
        await tx.update(users).set(updateUserFields).where(eq(users.id, id));
      }

      if (Object.keys(updateProfileFields).length > 0) {
        await tx
          .update(userProfiles)
          .set(updateProfileFields)
          .where(eq(userProfiles.userId, id));
      }

      if (managerId !== undefined) {
        await tx.delete(userManagers).where(eq(userManagers.userId, id)); // Remove old manager
        await tx.insert(userManagers).values({ userId: id, managerId });
      }

      return this.getUserById(id); // Return updated user data
    });
  }

  // 🔹 Delete User (Cascade Profile & Manager)
  async deleteUser(id: number) {
    return db.delete(users).where(eq(users.id, id));
  }

  // 🔹 Get User by Email (For Authentication)
  async getUserByEmail(email: string) {
    return db
      .select({
        id: users.id, // 🔹 User ID from users table
        role: userProfiles.role, // 🔹 Role from user_profiles table
        username: users.username,
        email: users.email,
        password: users.password,
      })
      .from(users)
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(users.email, email))
      .limit(1);
  }
  async getUserByIdForJwtAuth(userId: number) {
    return db
      .select({
        userId: users.id, // 🔹 User ID from users table
        role: userProfiles.role, // 🔹 Role from user_profiles table
        username: users.username,
        email: users.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        designation: userProfiles.designation,
      })
      .from(users)
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(users.id, userId))
      .limit(1);
  }
}

export const userRepo = new UserRepository();
