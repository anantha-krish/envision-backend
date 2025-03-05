import express, { Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());

// Define microservice routes
const routes: { [key: string]: string } = {
  "/users": "http://localhost:5000",
};

// Set up proxy middleware
Object.keys(routes).forEach((route) => {
  app.use(
    route,
    createProxyMiddleware({
      target: routes[route],
      changeOrigin: true,
    })
  );
});

// Health Check Route
app.get("/", (req: Request, res: Response) => {
  res.send("API Gateway is running...");
});

// Start the server
export default app;
