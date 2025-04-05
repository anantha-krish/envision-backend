import express from "express";
import {
  getIdeaStatusDistribution,
  getIdeaSubmissions,
  getTopContributors,
  getTopIdeas,
  getTrendingTags,
} from "../controller/statsController";
import { get } from "http";
const statsRouter = express.Router();

statsRouter.get("/idea-submissions", getIdeaSubmissions);
statsRouter.get("/top-ideas", getTopIdeas);
statsRouter.get("/top-contributors", getTopContributors);
statsRouter.get("/status-distribution", getIdeaStatusDistribution);
statsRouter.get("/trending-tags", getTrendingTags);

export default statsRouter;
