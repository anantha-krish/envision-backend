import { Router } from "express";

import {
  createUser,
  getUsers,
  updateUser,
  loginUser,
} from "../controllers/userController";
import { authenticateJwt } from "../middleware/authenticate";
import { authorizeRoles } from "../middleware/authorize";

const router = Router();

router.post("/api/", createUser);
router.get(
  "/api/",
  authenticateJwt,
  authorizeRoles("manager", "admin"),
  getUsers
);
router.put("/api/:id", authenticateJwt, updateUser);
router.post("/api/login", loginUser);

export default router;
