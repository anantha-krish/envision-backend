import express, { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import dotenv from "dotenv";
import Redis from "ioredis";
import { authenticateAndAuthorize } from "./authenticateMiddleware";

dotenv.config();

const app = express();

const proxyRequest = async (
  serviceName: string,
  req,
  res,
  next,
  pathRewrite = "/api"
) => {
  var target = await getNextService(serviceName);
  if (serviceName === "auth") {
    target = await getNextService("users");
  }

  if (!target) {
    return res.status(502).json({ error: "Service unavailable" });
  }

  createProxyMiddleware({
    target,
    changeOrigin: true,
    secure: false,
    pathRewrite: { [`^/${serviceName}`]: pathRewrite },
  })(req, res, next);
};

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const serviceIndex: { [key: string]: number } = {};

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
  return selectedService;
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
/*
// Proxy Requests Dynamically
app.use(async (req, res, next) => {
  try {
    const serviceName = req.path.split("/")[1]; // Extract microservice name

    if (serviceName === "auth") {
      // Directly forward auth requests without authentication
      return proxyRequest(serviceName, req, res, next, "/api/auth");
    }

    if (serviceName === "users") {
      return proxyRequest(serviceName, req, res, next);
    }

    // Authenticate for all other services and protected user routes
    await authenticateAndAuthorize(req, res, next);

    // Forward the request after authentication
    proxyRequest(serviceName, req, res, next);
  } catch (error) {
    console.error("Gateway error:", error);
    res.status(500).json({ error: "Internal gateway error" });
  }
});
*/
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
app.use(express.urlencoded({ extended: true }));
// Health Check Route
app.get("/", (req: Request, res: Response) => {
  res.send("API Gateway is running...");
});

// Start the server
export default app;
