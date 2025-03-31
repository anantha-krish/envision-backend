import { countDistinct, eq, inArray } from "drizzle-orm";
import { db } from "./db/db.connection";
import { likes, comments } from "./db/schema";
import { mgetEngagements, updateEngagementStats } from "./redis_client";

export async function fetchEngagementMetrics(ideaIds: number[]) {
  const cachedData = await mgetEngagements(ideaIds);

  const result: Record<number, { likes: number; comments: number }> = {};
  const missingIds: number[] = [];

  ideaIds.forEach((id, index) => {
    if (cachedData[index]) {
      result[id] = JSON.parse(cachedData[index] as string);
    } else {
      missingIds.push(id);
    }
  });

  if (missingIds.length === 0) return result; // All data was cached

  // Fetch only missing data from DB
  const metrics = await db
    .select({
      ideaId: likes.ideaId,
      likes: countDistinct(likes.userId).as("likes"),
      comments: countDistinct(comments.id).as("comments"),
    })
    .from(likes)
    .leftJoin(comments, eq(comments.ideaId, likes.ideaId))
    .where(inArray(likes.ideaId, missingIds))
    .groupBy(likes.ideaId);

  // Store in cache and update result
  metrics.forEach(async ({ ideaId, likes, comments }) => {
    result[ideaId] = { likes, comments };
    await updateEngagementStats(ideaId, result[ideaId]);
  });

  return result;
}
