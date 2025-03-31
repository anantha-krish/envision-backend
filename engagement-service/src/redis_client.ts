import Redis from "ioredis";
import {
  REDIS_CACHE_EXPIRY,
  REDIS_URL,
  SERVER_HOST,
  SERVER_PORT,
} from "./config";

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
