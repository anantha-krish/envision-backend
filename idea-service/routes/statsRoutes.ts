import express from "express";
import {
  getIdeaStatusDistribution,
  getIdeaSubmissions,
  getTopContributors,
} from "../controller/statsController";
const statsRouter = express.Router();

statsRouter.get("/idea-submissions", getIdeaSubmissions);
//statsRouter.get("/top-ideas", getTopIdeas);
statsRouter.get("/top-contributors", getTopContributors);
statsRouter.get("/status-distribution", getIdeaStatusDistribution);

export default statsRouter;
