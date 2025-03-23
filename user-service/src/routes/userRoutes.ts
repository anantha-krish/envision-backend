import { Router } from "express";

import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "../controllers/userController";
import { authenticateJwt } from "../middleware/authenticate";
import { authorizeRoles } from "../middleware/authorize";

const router = Router();

router.post("/register", createUser);
router.get("/", authenticateJwt, authorizeRoles("manager", "admin"), getUsers);
router.patch("/:id", authenticateJwt, updateUser);
router.delete("/:id", authenticateJwt, deleteUser);

export default router;
