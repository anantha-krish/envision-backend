import express, { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import dotenv from "dotenv";
import Redis from "ioredis";
import { authenticateAndAuthorize } from "./authenticateMiddleware";
import { NextFunction } from "http-proxy-middleware/dist/types";

dotenv.config();

const app = express();

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

app.get("/redis", async (req: Request, res: Response) => {
  try {
    const keys = await redis.keys("*"); // Get all keys

    const values = await Promise.all(
      keys.map(async (key) => {
        const type = await redis.type(key); // Check type of key

        let value;
        switch (type) {
          case "string":
            value = await redis.get(key);
            break;
          case "list":
            value = await redis.lrange(key, 0, -1);
            break;
          case "set":
            value = await redis.smembers(key);
            break;
          case "hash":
            value = await redis.hgetall(key);
            break;
          default:
            value = `Unsupported type: ${type}`;
        }

        return { key, type, value };
      })
    );

    res.json({ redis: values });
  } catch (error) {
    console.error("Error fetching Redis keys and values:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// Proxy Requests Dynamically
app.use(
  (req, res, next) => {
    const serviceName = req.path.split("/")[1]; // Extract microservice name
    if (serviceName == "users") {
      next();
      return;
    }
    authenticateAndAuthorize(req, res, next);
  },
  async (req, res, next) => {
    const serviceName = req.path.split("/")[1]; // Extract microservice name
    const target = await getNextService(serviceName);
    if (target) {
      createProxyMiddleware({
        target,
        changeOrigin: true,
        secure: false,
        pathRewrite: { [`^/${serviceName}`]: "/api" },
      })(req, res, next);
    }
  }
);
app.use(cors());
app.use(express.json());
// Health Check Route
app.get("/", (req: Request, res: Response) => {
  res.send("API Gateway is running...");
});

// Start the server
export default app;
