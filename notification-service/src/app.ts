import express, { Request, Response } from "express";
import router from "./router";
import { registerService } from "./redis_client";
import { consumeMessages } from "./kafka_consumer";
import { db } from "./db/db.connection";

const app = express();
app.use(express.json());
registerService();
setInterval(registerService, 30000);
consumeMessages().catch(console.error);
app.use("/api/", router);
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
export default app;
