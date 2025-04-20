import { Request, Response } from "express";
import { approverRepo } from "../src/repo/approverTeamRepo";

export const assignApprovers = async (req: Request, res: Response) => {
  try {
    const { ideaId, approverIds } = req.body;
    if (!ideaId || !Array.isArray(approverIds) || approverIds.length === 0) {
      res.status(400).json({ error: "Invalid input data" });
      return;
    }

    const result = await approverRepo.assignApproversToIdea(
      ideaId,
      approverIds
    );
    res
      .status(201)
      .json({ message: "Approvers assigned successfully", result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to assign approvers" });
  }
};

export const removeApprover = async (req: Request, res: Response) => {
  try {
    const { ideaId, userId } = req.body;
    if (!ideaId || !userId) {
      res.status(400).json({ error: "ideaId and userId are required" });
      return;
    }

    await approverRepo.removeApproverFromIdea(ideaId, userId);
    res.json({ message: "Approver removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to remove approver" });
  }
};

export const getApprovers = async (req: Request, res: Response) => {
  try {
    const { ideaId } = req.query;
    if (!ideaId) {
      res.status(400).json({ error: "ideaId is required" });
      return;
    }

    const approvers = await approverRepo.getApproversForIdea(Number(ideaId));
    res.json(approvers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch approvers" });
  }
};

export const getIdeasAssignedForApproval = async (
  req: Request,
  res: Response
) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const ideas = await approverRepo.getIdeasForApprover(Number(userId));
    res.json(ideas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch ideas" });
  }
};
