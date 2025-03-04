import express from "express";
import passport from "passport";
import "./src/auth/passport";
import userRoutes from "./src/routes/userRoutes";
import { SERVER_PORT } from "./src/config";
import { sendKafkaUserEvent } from "./src/config/kafka";

const app = express();

async function test() {
  await sendKafkaUserEvent("USER_CREATED", { message: "test" });
}

test();

app.use(express.json());
app.use("/", userRoutes);
/*
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    if (!req.user) {
      res.redirect("/");
      return;
    }
    const { user, token } = req.user as { user: String; token: string };
    res.json({ user, token });
  }
);
*/
app.listen(SERVER_PORT, () =>
  console.log(`Server running on port ${SERVER_PORT}`)
);
