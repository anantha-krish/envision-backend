import Redis from "ioredis";
import {
  REDIS_CACHE_EXPIRY,
  REDIS_URL,
  SERVER_HOST,
  SERVER_PORT,
} from "./config";
import { db } from "./db/db.connection";
import { comments, likes } from "./db/schema";
import { count, countDistinct, eq } from "drizzle-orm";

const redis = new Redis(REDIS_URL);

redis.on("error", (err) => console.error("Redis Error:", err));

export const registerService = async () => {
  await redis.sadd(
    `services:engagement`,
    `http://${SERVER_HOST}:${SERVER_PORT}`
  );
  console.log(
    `Registered engagement service at http://${SERVER_HOST}:${SERVER_PORT}`
  );
};

export const mgetEngagements = async (ideaIds: number[]) =>
  await redis.mget(ideaIds.map((id) => `engagement:${id}`));

export const incrementLikes = async (ideaId: number) => {
  if ((await redis.get(`idea_likes:${ideaId}`)) === null) {
    const [{ like }] = await db
      .select({ like: count().as("count") })
      .from(likes)
      .where(eq(likes.ideaId, ideaId));
    await redis.set(`idea_likes:${ideaId}`, like);
    return;
  }
  await redis.incr(`idea_likes:${ideaId}`);
};

export const decrementLikes = async (ideaId: number) => {
  if ((await redis.get(`idea_likes:${ideaId}`)) === null) {
    const [{ like }] = await db
      .select({ like: count().as("count") })
      .from(likes)
      .where(eq(likes.ideaId, ideaId));
    await redis.set(`idea_likes:${ideaId}`, like);
    return;
  }
  await redis.decr(`idea_likes:${ideaId}`);
};

export const incrementComments = async (ideaId: number) => {
  if ((await redis.get(`idea_comments:${ideaId}`)) === null) {
    const [{ comment }] = await db
      .select({ comment: count().as("count") })
      .from(comments)
      .where(eq(comments.ideaId, ideaId));
    await redis.set(`idea_comments:${ideaId}`, comment);
    return;
  }
  await redis.incr(`idea_comments:${ideaId}`);
};

export const decrementComments = async (ideaId: number) => {
  if ((await redis.get(`idea_comments:${ideaId}`)) === null) {
    const [{ like }] = await db
      .select({ like: count().as("count") })
      .from(comments)
      .where(eq(comments.ideaId, ideaId));
    await redis.set(`idea_comments:${ideaId}`, like);
    return;
  }
  await redis.decr(`idea_comments:${ideaId}`);
};

export const updateEngagementStats = async (
  ideaId: number,
  engagementStats: {
    likes: number;
    comments: number;
  }
) =>
  await redis.setex(
    `engagement:${ideaId}`,
    REDIS_CACHE_EXPIRY,
    JSON.stringify(engagementStats)
  );

export const mgetStats = async (keys: string[]) => await redis.mget(...keys);
export const msetStats = async (data: Record<string, number>) =>
  await redis.mset(data);

export const deleteStaleStats = async (keys: string[]) => redis.del(...keys);

export const getlikeKeysFromRedis = async () =>
  await redis.keys("idea_likes:*");
export const getCommentKeysFromRedis = async () =>
  await redis.keys("idea_comments:*");
