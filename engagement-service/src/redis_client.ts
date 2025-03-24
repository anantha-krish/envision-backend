import Redis from "ioredis";
import { REDIS_URL, SERVER_HOST, SERVER_PORT } from "./config";

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
  await redis.mget([...ideaIds].map((id) => `engagement:${id}`));

export const updateEngagementStats = async (
  redisUpdates: [string, string][]
) => {
  if (redisUpdates.length > 0) {
    await redis.mset(redisUpdates.flat());
    redisUpdates.forEach(([key]) => redis.expire(key, 3600));
  }
};

export async function updatePopularity(ideaId: number, score: number) {
  await redis.zincrby("ideas:popularity", score, ideaId.toString());
}
export async function updateTrendingScore(ideaId: number, score: number) {
  const timestamp = Date.now();
  await redis.zadd("ideas:trending", timestamp, ideaId.toString()); // Track timestamp
  await redis.zincrby("ideas:trending_scores", score, ideaId.toString()); // Increase score
}
