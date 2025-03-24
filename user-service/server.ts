import cookieParser from "cookie-parser";
import express from "express";
import "./src/auth/passport";
import { SERVER_PORT } from "./src/config";
import { registerService } from "./src/redis_client";
import userRoutes from "./src/routes/userRoutes";

const app = express();

//app.use(cors());
app.use(cookieParser());
app.use(express.json());

registerService();
// Register every 30 seconds to ensure availability
setInterval(registerService, 30000);
app.use("/api/", userRoutes);

app.listen(SERVER_PORT, () =>
  console.log(`Server running on port ${SERVER_PORT}`)
);
