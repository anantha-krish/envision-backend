import express from "express";
import dotenv from "dotenv";
import Redis from "ioredis";
import { SERVER_HOST, SERVER_PORT } from "./config";
import { use } from "passport";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("error", (err) => console.error("Redis Error:", err));

export const registerService = async () => {
  await redis.sadd(`services:users`, `http://${SERVER_HOST}:${SERVER_PORT}`);
  console.log(
    `Registered user service at http://${SERVER_HOST}:${SERVER_PORT}`
  );
};

export const blacklistToken = async (token: string) =>
  redis.sadd("blacklisted_tokens", token);

export const isTokenBlacklisted = async (token: string) =>
  redis.sismember("blacklisted_tokens", token);

export const saveRefreshToken = async (userId: number, refreshToken: string) =>
  redis.set(`refreshToken:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60);

export const getRefreshToken = async (userId: string) =>
  await redis.get(`refreshToken:${userId}`);

export const deleteRefreshToken = async (userId: string) =>
  userId && (await redis.del(`refreshToken:${userId}`));
