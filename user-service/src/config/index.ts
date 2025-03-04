import dotenv from "dotenv";
dotenv.config();

export const DB_URL = process.env.DB_URL || "";
export const SERVER_PORT = Number(process.env.SERVER_PORT) || 5000;
export const KAFKA_BROKER = process.env.KAFKA_BROKER || "";
export const JWT_SECRET = process.env.JWT_SECRET || "my_secret";
