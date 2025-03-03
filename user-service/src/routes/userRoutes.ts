import { Router } from "express";
import { authenticateUser } from "../middleware/auth";
import {
  createUser,
  getUsers,
  updateUser,
  loginUser,
} from "../controllers/userController";

const router = Router();

router.post("/", createUser);
router.get("/", authenticateUser, getUsers);
router.put("/:id", authenticateUser, updateUser);
router.post("/login", loginUser);

export default router;
