import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import "./src/auth/passport";
import { SERVER_PORT } from "./src/config";
import { registerService } from "./src/redis_client";
import userRoutes from "./src/routes/userRoutes";
import { db } from "./src/db/db.connection";
import { userRepo } from "./src/repository/userRepo";

const app = express();

//app.use(cors());
app.use(cookieParser());
app.use(express.json());
userRepo.seedRolesAndDesignations();
registerService();
// Register every 30 seconds to ensure availability
setInterval(registerService, 30000);
app.use("/api/", userRoutes);

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
