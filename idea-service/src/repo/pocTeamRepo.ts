import { db } from "../db/db.connection";
import { pocTeamMembers, pocTeams } from "../db/schema";
import { eq } from "drizzle-orm";

class PocTeamRepository {
  createPocTeam = async (name: string, memberIds: number[], ideaId: number) => {
    return await db.transaction(async (tx) => {
      // Insert team
      const [team] = await tx
        .insert(pocTeams)
        .values({ name, ideaId: ideaId })
        .returning({ id: pocTeams.id });

      // Insert members
      await tx
        .insert(pocTeamMembers)
        .values(memberIds.map((userId) => ({ userId, teamId: team.id })));

      return { teamId: team.id };
    });
  };

  assignIdeaToPocTeam = async (teamId: number, ideaId: number) => {
    return await db
      .update(pocTeams)
      .set({ ideaId })
      .where(eq(pocTeams.id, teamId))
      .returning();
  };

  getPocTeamByIdeaId = async (ideaId: number) => {
    return await db
      .select({
        userId: pocTeamMembers.userId,
        role: pocTeamMembers.role,
        teamName: pocTeams.name,
        ideaId: pocTeams.ideaId,
      })
      .from(pocTeamMembers)
      .innerJoin(pocTeams, eq(pocTeamMembers.teamId, pocTeams.id))
      .where(eq(pocTeams.ideaId, ideaId))
      .limit(1);
  };

  // Delete POC Team
  deletePocTeam = async (teamId: number) => {
    return db.delete(pocTeams).where(eq(pocTeams.id, teamId));
  };

  getAllPocTeams = async () => {
    return await db.select().from(pocTeams);
  };

  getPocTeamMembers = async (teamId: number) => {
    return await db
      .select()
      .from(pocTeamMembers)
      .where(eq(pocTeamMembers.teamId, teamId));
  };
}
export const pocTeamRepo = new PocTeamRepository();
