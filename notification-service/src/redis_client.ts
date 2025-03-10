import Redis from "ioredis";
import { SERVER_HOST, SERVER_PORT } from "./config";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("error", (err) => console.error("Redis Error:", err));

export const registerService = async () => {
  await redis.sadd(
    `services:notifications`,
    `http://${SERVER_HOST}:${SERVER_PORT}`
  );
  console.log(
    `Registered notifications service at http://${SERVER_HOST}:${SERVER_PORT}`
  );
};

export const getUnreadCount = async (userId: string) =>
  await redis.hget(`notifications:${userId}`, "unread");

export const updateUnreadCount = async (userId: string) =>
  await redis.hincrby(`notifications:${userId}`, "unread", 1);

export const markAllAsRead = async (userId: string) =>
  await redis.hset(`notifications:${userId}`, "unread", 0);
