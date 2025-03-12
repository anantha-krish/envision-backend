import express from "express";
import router from "./routes";
import { registerService } from "./redis_client";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
registerService();
setInterval(registerService, 30000);
app.use("/api/", router);
export default app;
