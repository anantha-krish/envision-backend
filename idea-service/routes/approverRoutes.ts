import { Router } from "express";
import {
  assignApprovers,
  getApprovers,
  getIdeasAssignedForApproval,
  removeApprover,
} from "../controller/approveController";

const router = Router();

router.post("/assign", assignApprovers);
router.delete("remove", removeApprover);
router.get("/", getApprovers);
router.get("/assigned-ideas/:userId", getIdeasAssignedForApproval);

export default router;
