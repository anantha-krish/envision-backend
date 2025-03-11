import express from "express";
import router from "./router";
import { registerService } from "./redis_client";
import { consumeMessages } from "./kafka_consumer";

const app = express();
app.use(express.json());
registerService();
setInterval(registerService, 30000);
consumeMessages().catch(console.error);
app.use("/api/", router);
export default app;
