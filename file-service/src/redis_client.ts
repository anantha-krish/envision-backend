import Redis from "ioredis";
import { SERVER_HOST, SERVER_PORT } from "./config/env";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("error", (err) => console.error("Redis Error:", err));

export const registerService = async () => {
  await redis.sadd(`services:files`, `http://${SERVER_HOST}:${SERVER_PORT}`);
  console.log(
    `Registered files service at http://${SERVER_HOST}:${SERVER_PORT}`
  );
};
