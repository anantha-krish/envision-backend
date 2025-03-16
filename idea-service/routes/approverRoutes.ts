import { Router } from "express";
import {
  assignApprovers,
  getApprovers,
  getIdeas,
  removeApprover,
} from "../controller/approveController";

const router = Router();

router.post("/approvers/assign", assignApprovers);
router.delete("/approvers/remove", removeApprover);
router.get("/approvers/:ideaId", getApprovers);
router.get("/approver-ideas/:userId", getIdeas);

export default router;
