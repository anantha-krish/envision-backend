import express, { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import dotenv from "dotenv";
import Redis from "ioredis";
import authenticateToken from "./authenticateMiddleware";
import { NextFunction } from "http-proxy-middleware/dist/types";

dotenv.config();

const app = express();
app.use(cors());

// Define microservice routes
const routes: { [key: string]: string } = {
  "/users": "http://localhost:5000",
};

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const serviceIndex: { [key: string]: number } = {};

// Round-robin load balancing
async function getNextService(serviceName: string): Promise<string | null> {
  const serviceList = await redis.smembers(`services:${serviceName}`);
  if (serviceList.length === 0) return null;

  serviceIndex[serviceName] =
    (serviceIndex[serviceName] || 0) % serviceList.length;
  const selectedService = serviceList[serviceIndex[serviceName]];

  serviceIndex[serviceName] += 1;
  return selectedService;
}

app.get("/redis", (req: Request, res: Response) => {
  res.json({ redis: redis.keys("*") });
});
// Proxy Requests Dynamically
app.use(async (req, res, next) => {
  const serviceName = req.path.split("/")[1]; // Extract microservice name
  const target = await getNextService(serviceName);

  if (target) {
    authenticateToken(req, res, () =>
      createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: { [`^/${serviceName}`]: "/api" },
      })(req, res, next)
    );
  } else {
    res.status(404).json({ message: "Service not found" });
  }
});

// Health Check Route
app.get("/", (req: Request, res: Response) => {
  res.send("API Gateway is running...");
});

// Start the server
export default app;
