import dotenv from "dotenv";
dotenv.config();

export const DB_URL = process.env.DB_URL || "";
export const SERVER_PORT = Number(process.env.SERVER_PORT) || 5003;
export const KAFKA_BROKER = process.env.KAFKA_BROKER || "";

export const REDIS_URL = process.env.REDIS_URL || "";
export const SERVER_HOST = process.env.SERVER_HOST || "localhost";

export const REDIS_CACHE_EXPIRY = process.env.REDIS_CACHE_EXPIRY || 300;
