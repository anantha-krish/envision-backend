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
    `Registered files service at http://${SERVER_HOST}:${SERVER_PORT}`
  );
};
