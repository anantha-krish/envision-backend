import express from "express";
import dotenv from "dotenv";
import Redis from "ioredis";
import { SERVER_HOST, SERVER_PORT } from "./config";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export const registerService = async () => {
  await redis.sadd(`services:user`, `http://${SERVER_HOST}:${SERVER_PORT}`);
  console.log(`Registered service at http://${SERVER_HOST}:${SERVER_PORT}`);
};
