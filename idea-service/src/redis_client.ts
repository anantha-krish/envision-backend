import Redis from "ioredis";
import { SERVER_HOST, SERVER_PORT, SERVICE_NAME } from "./config";
import { ideas } from "./db/schema";
import { count, eq } from "drizzle-orm";
import { db } from "./db/db.connection";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("error", (err) => console.error("Redis Error:", err));

export const registerService = async () => {
  await redis.sadd(
    `services:${SERVICE_NAME}`,
    `http://${SERVER_HOST}:${SERVER_PORT}`
  );
  console.log(
    `Registered ${SERVICE_NAME} service at http://${SERVER_HOST}:${SERVER_PORT}`
  );
};

export const incrementViews = async (ideaId: number) => {
  if (getViews(ideaId) === null) {
    const [{ view }] = await db
      .select({ view: count().as("count") })
      .from(ideas)
      .where(eq(ideas.id, ideaId));
    await redis.set(`idea_views:${ideaId}`, view);
    return;
  }

  await redis.incr(`idea_views:${ideaId}`);
};
export const getViews = async (ideaId: number) =>
  await redis.get(`idea_views:${ideaId}`);

export const mgetViews = async (ideaIds: number[]) =>
  await redis.mget([...ideaIds].map((id) => `idea_views:${id}`));
export const mgetLikes = async (ideaIds: number[]) =>
  await redis.mget([...ideaIds].map((id) => `idea_likes:${id}`));
export const mgetComments = async (ideaIds: number[]) =>
  await redis.mget([...ideaIds].map((id) => `idea_comments:${id}`));

export const getViewedIdeasKeys = async () => await redis.keys("idea_views:*");
export const getLikedIdeasKeys = async () => await redis.keys("idea_likes:*");
export const getCommentedIdeasKeys = async () =>
  await redis.keys("idea_comments:*");

export const getValue = async (key: string) => await redis.get(key);
export const delValue = async (key: string[]) => await redis.del(...key);
