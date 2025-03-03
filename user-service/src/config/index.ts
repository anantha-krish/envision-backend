import dotenv from "dotenv";
dotenv.config();

export const DB_URL = process.env.DB_URL||"";
export const SERVER_PORT = Number(process.env.SERVER_PORT)||5000;