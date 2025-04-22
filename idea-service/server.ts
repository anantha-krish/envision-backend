import express, { Request, Response } from "express";
import approverRouter from "./routes/approverRoutes";
import ideaRouter from "./routes/ideaRoutes";
import teamsRouter from "./routes/pocTeamRoutes";
import { SERVER_PORT } from "./src/config";
import { registerService } from "./src/redis_client";
import { ideaRepo } from "./src/repo/ideasRepo";
import { db } from "./src/db/db.connection";
import statsRouter from "./routes/statsRoutes";

const app = express();

const syncEngagementStats = async () => {
  try {
    console.log("Syncing views from Redis to DB...");
    await ideaRepo.syncEngagementStatsToDB();
  } catch (err) {
    console.error("Error syncing views:", err);
  }
};
syncEngagementStats();
setInterval(syncEngagementStats, 30 * 1000);
//app.use(cors());
app.use(express.json());

registerService();
// Register every 30 seconds to ensure availability
setInterval(registerService, 30000);
app.use("/api/stats/", statsRouter);
app.use("/api/teams/", teamsRouter);
app.use("/api/approvers/", approverRouter);
app.use("/api/", ideaRouter);
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
app.listen(SERVER_PORT, () =>
  console.log(`Server running on port ${SERVER_PORT}`)
);
