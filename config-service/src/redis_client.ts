import Redis from "ioredis";
import { SERVER_HOST, SERVER_PORT } from "./env";

export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const redis = new Redis(REDIS_URL);
redis.on("error", (err) => console.error("Redis Error:", err));

export const registerService = async () => {
  await redis.sadd(`services:config`, `http://${SERVER_HOST}:${SERVER_PORT}`);
  console.log(
    `Registered config service at http://${SERVER_HOST}:${SERVER_PORT}`
  );
};

export const notifyServicesForConfigUpdate = async (serviceName: string) => {
  await redis.publish(
    "config-update",
    JSON.stringify({ service: serviceName })
  );
};

export const updateCacheConfig = async (serviceName: string, newConfig: any) =>
  await redis.set(`config:${serviceName}`, JSON.stringify(newConfig));

export const cacheConfig = async (serviceName: string, serviceConfig: any) => {
  await redis.setex(
    `config:${serviceName}`,
    3600,
    JSON.stringify(serviceConfig)
  );
};

export const getCachedConfig = async (serviceName: string) =>
  await redis.get(`config:${serviceName}`);

export const deleteCache = async (serviceName: string) =>
  await redis.del(`config:${serviceName}`);
