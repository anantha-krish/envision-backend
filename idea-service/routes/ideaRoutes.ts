import { Router } from "express";
import {
  createIdea,
  getAllIdeas,
  updateIdea,
  getIdeaDetails,
  updateIdeaStatus,
} from "../controller/ideaController";

const router = Router();

router.post("/", createIdea); // Create an idea with tags
router.get("/", getAllIdeas); // Get all ideas with tags
router.patch("/:id/status", updateIdeaStatus);
router.get("/:id", getIdeaDetails);

router.put("/:id", updateIdea); // Update an idea with new tags

export default router;
