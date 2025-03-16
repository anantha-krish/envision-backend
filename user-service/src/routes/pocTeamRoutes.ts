import express from "express";
import {
  assignIdea,
  createPocTeam,
  getAllPocTeams,
  getTeamMembers,
} from "../controllers/pocTeamController";

const pocTeamRouter = express.Router();

pocTeamRouter.post("/poc-teams", createPocTeam);
pocTeamRouter.post("/poc-teams/assign-idea", assignIdea);
pocTeamRouter.get("/poc-teams", getAllPocTeams);
pocTeamRouter.get("/poc-teams/:teamId/members", getTeamMembers);

export default pocTeamRouter;
