import express from "express";
import dotenv from "dotenv";
import engagementRoutes from "./src/routes/engagement";
import { SERVER_PORT } from "./src/config";
import { registerService } from "./src/redis_client";
import {
  processEngagementEvents,
  processEngagementMetricsRequests,
  processEngagementRequest,
} from "./src/kafka/consumer";

const app = express();
//processEngagementRequest();
//processEngagementEvents();
processEngagementMetricsRequests();
app.use(express.json());
app.use("/api/", engagementRoutes);
registerService();
setInterval(registerService, 30000);
app.listen(SERVER_PORT, () =>
  console.log(`Server running on port ${SERVER_PORT}`)
);
