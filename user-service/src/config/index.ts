import dotenv from "dotenv";
dotenv.config();
import { StringValue } from "ms";

export const DB_URL = process.env.DB_URL || "";
export const SERVER_PORT = Number(process.env.SERVER_PORT) || 5000;
export const KAFKA_BROKER = process.env.KAFKA_BROKER || "";
export const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || "my_secret";
export const ACCESS_TOKEN_EXPIRY_IN_MINS =
  (process.env.ACCESS_TOKEN_EXPIRY_IN_MINS as StringValue) || "15m";

export const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "my_refresh_secret";
export const REFRESH_TOKEN_EXPIRY_IN_DAYS =
  (process.env.REFRESH_TOKEN_EXPIRY_IN_DAYS as StringValue) || "2d";

export const REDIS_URL = process.env.REDIS_URL || "";
export const SERVER_HOST = process.env.SERVER_HOST || "localhost";
