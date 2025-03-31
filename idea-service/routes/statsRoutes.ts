import express from "express";
import { getIdeaSubmissions } from "../controller/statsController";
const statsRouter = express.Router();

statsRouter.get("/idea-submissions", getIdeaSubmissions);

export default statsRouter;
