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
