import { Router } from "express";

import {
  createUser,
  deleteUser,
  getAllDesignations,
  getAllRoles,
  getAllUsersByRoleCode as filterUsers,
  getUsers,
  loginUser,
  logOut,
  refreshAccessToken,
  updateUser,
} from "../controllers/userController";
import { authenticateJwt } from "../middleware/authenticate";
import { authorizeRoles } from "../middleware/authorize";
import { designations } from "../db/schema";

const router = Router();

router.post("/register", createUser);
//router.get("/", authenticateJwt, authorizeRoles("ADMIN"), getUsers);
router.patch("/:id", authenticateJwt, updateUser);
router.delete("/:id", authenticateJwt, deleteUser);
router.post("/login", loginUser);
router.get("/", filterUsers);
router.get("/roles", getAllRoles);
router.get("/designations", getAllDesignations);
router.get("/logout", authenticateJwt, logOut);
router.post("/refresh", refreshAccessToken);

export default router;
