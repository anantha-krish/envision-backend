import { eq, SQL } from "drizzle-orm";
import { PgEnum } from "drizzle-orm/pg-core";
import { DB } from "../db/db.connection";
import { Roles, users } from "../db/schema";

class UserRepository {
  // Fetch All Users
  async getAllUsers() {
    return DB.select({
      user_id: users.id,
      user_name: users.username,
      email: users.email,
      role: users.role,
    }).from(users);
  }

  // Get User by ID
  async getUserById(id: number) {
    return DB.select().from(users).where(eq(users.id, id));
  }

  // Create User
  async createUser(
    username: string,
    email: string,
    password: string,
    role: Roles
  ) {
    return DB.insert(users)
      .values({ username, email, password, role })
      .returning();
  }

  // Delete User
  async deleteUser(id: number) {
    return DB.delete(users).where(eq(users.id, id));
  }

  async updateUser(username: string, email: string, id: number) {
    return await DB.update(users)
      .set({
        username,
        email,
      })
      .from(users)
      .where(eq(users.id, id))
      .returning();
  }
  async getUserByEmail(email: string) {
    return DB.select().from(users).where(eq(users.email, email));
  }
}
export const userRepo = new UserRepository();
