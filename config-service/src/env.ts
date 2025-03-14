import dotenv from "dotenv";
dotenv.config();

export const SERVER_PORT = Number(process.env.SERVER_PORT) || 4000;
export const SERVER_HOST = process.env.SERVER_HOST || "localhost";
