import { Router } from "express";
import {
  createIdea,
  updateIdea,
  getIdeaDetails,
  updateIdeaStatus,
  getTags,
  createTag,
  getAllIdeas,
  updateIdeaTags,
} from "../controller/ideaController";

const router = Router();

router.post("/", createIdea); // Create an idea with tags
router.get("/", getAllIdeas);
router.get("/tags", getTags);
router.post("/tags", createTag);
router.patch("/:id/status", updateIdeaStatus);
router.patch("/:id/tags", updateIdeaTags);
router.get("/:id", getIdeaDetails);

router.patch("/:id", updateIdea);

export default router;
