import express, { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import dotenv from "dotenv";
import Redis from "ioredis";
import { authenticateAndAuthorize } from "./authenticateMiddleware";

dotenv.config();

const app = express();
app.use(cors());

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const serviceIndex: { [key: string]: number } = {};
const proxyCache: { [key: string]: any } = {};

// Round-robin load balancing
export const getNextService = async (
  serviceName: string
): Promise<string | null> => {
  const serviceList = await redis.smembers(`services:${serviceName}`);
  if (serviceList.length === 0) return null;

  serviceIndex[serviceName] =
    (serviceIndex[serviceName] || 0) % serviceList.length;
  const selectedService = serviceList[serviceIndex[serviceName]];

  serviceIndex[serviceName] += 1;
  try {
    // Health check using fetch
    const response = await fetch(`${selectedService}/health`, {
      method: "GET",
      // signal: AbortSignal.timeout(1000), // Timeout after 1 second
    });

    if (response.ok) {
      return selectedService; // Return if service is healthy
    }
  } catch (error) {
    console.warn(`❌ Unhealthy service detected: ${selectedService}`);
    // Remove the unhealthy service from Redis
    await redis.srem(`services:${serviceName}`, selectedService);
  }

  return null; // No healthy services available
};

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

app.use(
  (req, res, next) => {
    const serviceName = req.path.split("/")[1]; // Extract microservice name
    if (serviceName === "users") {
      next();
      return;
    }
    authenticateAndAuthorize(req, res, next);
  },
  async (req, res, next) => {
    const serviceName = req.path.split("/")[1]; // Extract microservice name
    const target = await getNextService(serviceName);
    if (target) {
      if (!proxyCache[serviceName]) {
        proxyCache[serviceName] = createProxyMiddleware({
          target,
          changeOrigin: true,
          secure: false,
          pathRewrite: { [`^/${serviceName}`]: "/api" },
        });
      }

      return proxyCache[serviceName](req, res, next);
    }
    res.status(502).json({ error: "Service unavailable" });
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Health Check Route
app.get("/", (req: Request, res: Response) => {
  res.send("API Gateway is running...");
});

// Start the server
export default app;
