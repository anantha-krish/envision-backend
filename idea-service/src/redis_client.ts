import Redis from "ioredis";
import { SERVER_HOST, SERVER_PORT, SERVICE_NAME } from "./config";

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
  await redis.incr(`idea_views:${ideaId}`);
};
export const getViews = async (ideaId: number) =>
  await redis.get(`idea_views:${ideaId}`);

export const mgetViews = async (ideaIds: number[]) =>
  await redis.mget([...ideaIds].map((id) => `idea_views:${id}`));

export const getAllIdeasKeys = async () => await redis.keys("idea_views:*");

export const getValue = async (key: string) => await redis.get(key);
export const delValue = async (key: string[]) => await redis.del(...key);
export async function storeIdeaCreation(ideaId: number, createdAt: string) {
  await redis.zadd(
    "ideas:recent",
    new Date(createdAt).getTime(),
    ideaId.toString()
  );
}
export async function getTrendingIdeas() {
  const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
  await redis.zremrangebyscore("ideas:trending", 0, cutoffTime); // Remove old entries

  return await redis.zrevrange("ideas:trending_scores", 0, 9, "WITHSCORES"); // Top 10
}
