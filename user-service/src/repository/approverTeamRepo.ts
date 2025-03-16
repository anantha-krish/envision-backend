import { db } from "../db/db.connection";
import { and, eq } from "drizzle-orm";
import { ideaApprovers } from "../db/schema";

class ApproverRepository {
  public async assignApproversToIdea(ideaId: number, approverIds: number[]) {
    return await db.transaction(async (tx) => {
      // Insert approvers if not already assigned
      const values = approverIds.map((userId) => ({ ideaId, userId }));
      await tx.insert(ideaApprovers).values(values);
      return { ideaId, approverIds };
    });
  }

  public async removeApproverFromIdea(ideaId: number, userId: number) {
    return await db
      .delete(ideaApprovers)
      .where(
        and(eq(ideaApprovers.ideaId, ideaId), eq(ideaApprovers.userId, userId))
      );
  }

  public async getApproversForIdea(ideaId: number) {
    return await db
      .select()
      .from(ideaApprovers)
      .where(eq(ideaApprovers.ideaId, ideaId));
  }

  public async getIdeasForApprover(userId: number) {
    return await db
      .select()
      .from(ideaApprovers)
      .where(eq(ideaApprovers.userId, userId));
  }
}
export const approverRepo = new ApproverRepository();
