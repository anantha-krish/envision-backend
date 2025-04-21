import { Router } from "express";
import {
  createIdea,
  updateIdea,
  getIdeaDetails,
  updateIdeaStatus,
  getTags,
  createTag,
  getAllIdeas,
} from "../controller/ideaController";
import { getTrendingIdeas } from "../src/redis_client";

const router = Router();

router.post("/", createIdea); // Create an idea with tags
router.get("/", getAllIdeas);
router.get("/tags", getTags);
router.post("/tags", createTag);
router.get("/trending", async (req, res) => {
  var trendingIdeas = await getTrendingIdeas();
  res.json(trendingIdeas);
});
router.patch("/:id/status", updateIdeaStatus);
router.get("/:id", getIdeaDetails);

router.put("/:id", updateIdea);

export default router;
