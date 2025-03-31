import express, { Request, Response } from "express";
import dotenv from "dotenv";
import engagementRoutes from "./src/routes/engagement";
import { SERVER_PORT } from "./src/config";
import { registerService } from "./src/redis_client";
import { processEngagementMetricsRequests } from "./src/kafka/consumer";
import { db } from "./src/db/db.connection";

const app = express();
// Start the consumer when the service boots up
processEngagementMetricsRequests().catch(console.error);
app.use(express.json());
app.use("/api/", engagementRoutes);
app.get("/health", async (req: Request, res: Response) => {
  try {
    // Perform a simple DB query to check the connection
    await db.execute("SELECT 1");

    res.status(200).json({ status: "ok", service: "user-service" });
  } catch (error) {
    console.error("Database health check failed:", error);
    res
      .status(500)
      .json({ status: "error", message: "Database connection failed" });
  }
});
registerService();
setInterval(registerService, 30000);
app.listen(SERVER_PORT, () =>
  console.log(`Server running on port ${SERVER_PORT}`)
);
