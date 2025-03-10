import express from "express";
import router from "./router";
import { registerService } from "./redis_client";
import { consumeMessages } from "./kafka_consumer";

const app = express();
app.use(express.json());
registerService();
// Register every 30 seconds to ensure availability
setInterval(registerService, 30000);
consumeMessages().catch(console.error);
app.use("/api/", router);
export default app;
