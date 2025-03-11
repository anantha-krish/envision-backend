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

router.post("/register", createUser);
router.get(
  "/api",
  authenticateJwt,
  authorizeRoles("manager", "admin"),
  getUsers
);
router.patch("/:id", authenticateJwt, updateUser);
router.post("/login", loginUser);
router.delete("/:id", authenticateJwt, deleteUser);
router.get("/logout", authenticateJwt, logOut);
router.get("/refresh", refreshAccessToken);
export default router;
