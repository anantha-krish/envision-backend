import { Router } from "express";
import {
  createIdea,
  getAllIdeas,
  updateIdea,
  getIdeaDetails,
  updateIdeaStatus,
} from "../controller/ideaController";
import { getTrendingIdeas } from "../src/redis_client";

const router = Router();

router.post("/", createIdea); // Create an idea with tags
router.get("/", getAllIdeas); // Get all ideas with tags
router.get("/trending", async (req, res) => {
  var trendingIdeas = await getTrendingIdeas();
  res.json(trendingIdeas);
});
router.patch("/:id/status", updateIdeaStatus);
router.get("/:id", getIdeaDetails);

router.put("/:id", updateIdea); // Update an idea with new tags

export default router;
