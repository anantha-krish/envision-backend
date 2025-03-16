import { Request, Response } from "express";
import { ideaRepo } from "../src/repo/ideasRepo";

// Create an idea
export const createIdea = async (req: Request, res: Response) => {
  const { title, summary, description, statusId, tags } = req.body;

  if (!title || !summary || !description || !statusId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const result = await ideaRepo.createIdea(
      title,
      summary,
      description,
      statusId,
      tags || []
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get all ideas
export const getAllIdeas = async (_req: Request, res: Response) => {
  try {
    const results = await ideaRepo.getAllIdeas();
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Update idea
export const updateIdea = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, summary, description, statusId, tags } = req.body;

  try {
    const result = await ideaRepo.updateIdea(
      Number(id),
      title,
      summary,
      description,
      statusId,
      tags
    );
    if (!result) return res.status(404).json({ error: "Idea not found" });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
