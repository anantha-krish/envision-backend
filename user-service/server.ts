import express from "express";
import passport from "passport";
import "./src/auth/passport";
import userRoutes from "./src/routes/userRoutes";
import { SERVER_PORT } from "./src/config";
import { sendKafkaUserEvent } from "./src/config/kafka";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerService } from "./src/redis_client";

const app = express();

async function test() {
  await sendKafkaUserEvent("USER_CREATED", { message: "test" });
}

test();
//app.use(cors());
app.use(cookieParser());
app.use(express.json());

registerService();
// Register every 30 seconds to ensure availability
setInterval(registerService, 30000);

app.use("/", userRoutes);

app.listen(SERVER_PORT, () =>
  console.log(`Server running on port ${SERVER_PORT}`)
);
