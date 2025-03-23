import { Router } from "express";
import {
  loginUser,
  logOut,
  refreshAccessToken,
} from "../controllers/userController";
import { authenticateJwt } from "../middleware/authenticate";

const router = Router();
router.post("/login", loginUser);
router.get("/logout", authenticateJwt, logOut);
router.get("/refresh", refreshAccessToken);
export default router;
