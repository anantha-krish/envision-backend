import express from "express";
import {
  assignIdea,
  createPocTeam,
  getPocTeamforIdea,
  getTeamMembers,
} from "../controller/pocTeamController";

const pocTeamRouter = express.Router();

pocTeamRouter.post("/poc-teams", createPocTeam);
pocTeamRouter.post("/poc-teams/assign-idea", assignIdea);
pocTeamRouter.get("/poc-teams", getPocTeamforIdea);
pocTeamRouter.get("/poc-teams/:teamId/members", getTeamMembers);

export default pocTeamRouter;
