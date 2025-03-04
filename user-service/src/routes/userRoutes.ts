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

router.post("/", createUser);
router.get("/", authenticateJwt, authorizeRoles("manager", "admin"), getUsers);
router.put("/:id", authenticateJwt, updateUser);
router.post("/login", loginUser);

export default router;
