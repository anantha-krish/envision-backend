import { eq, inArray } from "drizzle-orm";
import { db } from "../db/db.connection";
import {
  users,
  userProfiles,
  userManagers,
  roles,
  designations,
} from "../db/schema";
import { use } from "passport";

class UserRepository {
  // 🔹 Fetch All Users with Profiles & Manager Info
  async getAllUsers(userIds?: number[]) {
    const query = db
      .select({
        userId: users.id,
        username: users.username,
        email: users.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        roleCode: roles.roleCode,
        designationCode: designations.designationCode,
        managerId: userManagers.managerId,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(roles, eq(userProfiles.roleId, roles.id))
      .leftJoin(designations, eq(userProfiles.designationId, designations.id))
      .leftJoin(userManagers, eq(users.id, userManagers.userId));
    if (userIds && userIds.length > 0) {
      query.where(inArray(users.id, userIds));
    }
    return await query;
  }

  async getUserById(id: number) {
    const user = await db
      .select({
        userId: users.id,
        username: users.username,
        email: users.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        roleCode: roles.roleCode,
        designationCode: designations.designationCode,
        managerId: userManagers.managerId,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(roles, eq(userProfiles.roleId, roles.id))
      .leftJoin(designations, eq(userProfiles.designationId, designations.id))
      .leftJoin(userManagers, eq(users.id, userManagers.userId))
      .where(eq(users.id, id))
      .limit(1);

    if (!user.length) {
      throw new Error(`User with ID ${id} not found`);
    }

    const {
      userId,
      username,
      email,
      firstName,
      lastName,
      roleCode,
      designationCode,
      managerId,
    } = user[0];

    return {
      userId,
      username,
      email,
      firstName,
      lastName,
      roleCode,
      designationCode,
      managerId: managerId || null, // Manager may be null if not assigned
    };
  }

  async createUser(
    username: string,
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    roleCode: string,
    designationCode: string,
    managerId?: number // Optional manager assignment
  ) {
    return await db.transaction(async (tx) => {
      // Lookup roleId based on roleCode
      const roleRecord = await tx.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.roleCode, roleCode),
      });
      if (!roleRecord) throw new Error(`Invalid role: ${roleCode}`);

      // Lookup designationId based on designationCode
      const designationRecord = await tx.query.designations.findFirst({
        where: (designations, { eq }) =>
          eq(designations.designationCode, designationCode),
      });
      if (!designationRecord)
        throw new Error(`Invalid designation: ${designationCode}`);

      // Insert into `users` table
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
        roleId: roleRecord.id,
        designationId: designationRecord.id,
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
        role: roleCode,
        designation: designationCode,
        managerId: managerId || null,
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
    role?: string,
    designation?: string,
    managerId?: number
  ) {
    return await db.transaction(async (tx) => {
      const updateUserFields: Partial<{ username: string; email: string }> = {};
      const updateProfileFields: Partial<{
        firstName: string;
        lastName: string;
        role: string;
        designation: string;
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

  async deleteUser(id: number) {
    return await db.transaction(async (tx) => {
      const userExists = await tx
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (userExists.length === 0) {
        return { message: `User with ID ${id} not found`, status: 404 };
      }

      await tx.delete(userManagers).where(eq(userManagers.userId, id));
      await tx.delete(userProfiles).where(eq(userProfiles.userId, id));
      await tx.delete(users).where(eq(users.id, id));

      return {
        message: `User with ID ${id} successfully deleted`,
        status: 200,
      };
    });
  }

  // 🔹 Get User by Email (For Authentication)
  async getUserByEmail(email: string) {
    return await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        roleCode: roles.roleCode,
      })
      .from(users)
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .innerJoin(roles, eq(userProfiles.roleId, roles.id))
      .where(eq(users.email, email))
      .limit(1);
  }

  async getUserByIdForJwtAuth(userId: number) {
    return await db
      .select({
        userId: users.id,
        roleCode: roles.roleCode,
        username: users.username,
        email: users.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
        designationCode: designations.designationCode,
      })
      .from(users)
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .innerJoin(roles, eq(userProfiles.roleId, roles.id))
      .innerJoin(designations, eq(userProfiles.designationId, designations.id))
      .where(eq(users.id, userId))
      .limit(1);
  }

  async seedRolesAndDesignations() {
    const roleData = [
      { roleCode: "USER", roleName: "User" },
      { roleCode: "POC_TEAM", roleName: "Proof of Concept Team" },
      { roleCode: "MANAGER", roleName: "Manager" },
      { roleCode: "APPROVER", roleName: "Approver" },
      { roleCode: "ADMIN", roleName: "Administrator" },
    ];

    const designationData = [
      { designationCode: "MANAGER", designationName: "Manager" },
      { designationCode: "ARCHITECT", designationName: "Architect" },
      { designationCode: "LEAD", designationName: "Lead" },
      {
        designationCode: "BUSINESS_ANALYST",
        designationName: "Business Analyst",
      },
      {
        designationCode: "SENIOR_ENGINEER",
        designationName: "Senior Engineer",
      },
      { designationCode: "ENGINEER", designationName: "Engineer" },
    ];

    await db.insert(roles).values(roleData).onConflictDoNothing();
    await db.insert(designations).values(designationData).onConflictDoNothing();

    console.log("✅ Roles and Designations seeded successfully!");
  }

  async getAllUsersByRoleCode(roleCode: string) {
    return await db
      .select({
        userId: users.id,
        email: users.email,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
      })
      .from(users)
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .innerJoin(roles, eq(userProfiles.roleId, roles.id))
      .where(eq(roles.roleCode, roleCode));
  }

  async getAllUsersByUserId(userIds: number[]) {
    return await db
      .select({
        userId: users.id,
        firstName: userProfiles.firstName,
        lastName: userProfiles.lastName,
      })
      .from(users)
      .innerJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(inArray(users.id, userIds));
  }

  async getAllRoles() {
    return await db
      .select({
        id: roles.id,
        roleCode: roles.roleCode,
        roleName: roles.roleName,
      })
      .from(roles);
  }
  async getAllDesignations() {
    return await db
      .select({
        id: designations.id,
        designationCode: designations.designationCode,
        designationName: designations.designationName,
      })
      .from(designations);
  }
}

export const userRepo = new UserRepository();
