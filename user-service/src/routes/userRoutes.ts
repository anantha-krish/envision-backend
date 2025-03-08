import { Router } from "express";

import {
  createUser,
  getUsers,
  updateUser,
  loginUser,
  deleteUser,
  logOut,
  refreshAccessToken,
} from "../controllers/userController";
import { authenticateJwt } from "../middleware/authenticate";
import { authorizeRoles } from "../middleware/authorize";

const router = Router();

router.post("/api/register", createUser);
router.get(
  "/api",
  authenticateJwt,
  authorizeRoles("manager", "admin"),
  getUsers
);
router.patch("/api/:id", authenticateJwt, updateUser);
router.post("/api/login", loginUser);
router.delete("/api/:id", authenticateJwt, deleteUser);
router.get("/api/logout", authenticateJwt, logOut);
router.get("/api/refresh", authenticateJwt, refreshAccessToken);
export default router;
