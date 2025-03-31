import express, { Request, Response } from "express";
import router from "./routes";
import { registerService } from "./redis_client";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
registerService();
setInterval(registerService, 30000);
app.use("/api/", router);
app.get("/health", async (req: Request, res: Response) => {
  try {
    res.status(200).json({ status: "ok", service: "file-service" });
  } catch (error) {
    console.error("Database health check failed:", error);
    res
      .status(500)
      .json({ status: "error", message: "Database connection failed" });
  }
});
export default app;
