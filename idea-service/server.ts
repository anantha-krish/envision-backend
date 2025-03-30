import express from "express";
import approverRouter from "./routes/approverRoutes";
import ideaRouter from "./routes/ideaRoutes";
import teamsRouter from "./routes/pocTeamRoutes";
import { SERVER_PORT } from "./src/config";
import { registerService } from "./src/redis_client";
import { ideaRepo } from "./src/repo/ideasRepo";

const app = express();

const syncViews = async () => {
  try {
    console.log("Syncing views from Redis to DB...");
    await ideaRepo.syncViewsToDB();
  } catch (err) {
    console.error("Error syncing views:", err);
  }
};

// Run every 2 minutes
setInterval(syncViews, 2 * 60 * 1000);
//app.use(cors());
app.use(express.json());

registerService();
// Register every 30 seconds to ensure availability
setInterval(registerService, 30000);
app.use("/api/teams/", teamsRouter);
app.use("/api/approvers/", approverRouter);
app.use("/api/", ideaRouter);

app.listen(SERVER_PORT, () =>
  console.log(`Server running on port ${SERVER_PORT}`)
);
