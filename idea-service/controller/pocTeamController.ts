import { Request, Response } from "express";
import { pocTeamRepo } from "../src/repo/pocTeamRepo";

export const createPocTeam = async (req: Request, res: Response) => {
  try {
    const { name, memberIds, ideaId } = req.body;
    if (!name || !Array.isArray(memberIds) || memberIds.length === 0) {
      res.status(400).json({ error: "Invalid input data" });
      return;
    }

    const result = await pocTeamRepo.createPocTeam(name, memberIds, ideaId);
    res
      .status(201)
      .json({ message: "POC Team created", teamId: result.teamId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create POC Team" });
  }
};

export const assignIdea = async (req: Request, res: Response) => {
  try {
    const { teamId, ideaId } = req.body;
    if (!teamId || !ideaId) {
      res.status(400).json({ error: "teamId and ideaId are required" });
      return;
    }

    await pocTeamRepo.assignIdeaToPocTeam(teamId, ideaId);
    res.json({ message: "Idea assigned to POC Team" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to assign idea" });
  }
};

export const getPocTeamforIdea = async (req: Request, res: Response) => {
  try {
    const ideaIdParam = req.query.ideaId;

    if (ideaIdParam !== undefined) {
      const ideaId = Number(ideaIdParam);
      if (isNaN(ideaId) || ideaId <= 0) {
        res.status(400).json({ error: "Invalid ideaId provided." });
        return;
      }

      const result = await pocTeamRepo.getPocTeamByIdeaId(ideaId);
      res.status(200).json(result);
      return;
    }

    const teams = await pocTeamRepo.getAllPocTeams();
    res.status(200).json(teams);
    return;
  } catch (error) {
    console.error("Error fetching POC teams:", error);
    res.status(500).json({ error: "Failed to fetch POC teams" });
    return;
  }
};
export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    if (!teamId) {
      res.status(400).json({ error: "teamId is required" });
      return;
    }

    const members = await pocTeamRepo.getPocTeamMembers(Number(teamId));
    res.json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
};
