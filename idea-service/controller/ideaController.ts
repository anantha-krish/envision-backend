import { Request, Response } from "express";
import { ideaRepo } from "../src/repo/ideasRepo";

// Create an idea
export const createIdea = async (req: Request, res: Response) => {
  const {
    title,
    summary,
    description,
    statusId,
    tags,
    managerId,
    submittedBy,
  } = req.body;

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
      managerId,
      tags || [],
      submittedBy?.length > 0 ? submittedBy : [req.headers.user_id]
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get all ideas
export const getAllIdeas = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) ?? 1;
    const pageSize = Number(req.query.pageSize ?? 10);
    const results = await ideaRepo.getAllIdeas(page, pageSize);
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
    const result = await ideaRepo.updateIdeaContent(
      Number(id),
      title,
      summary,
      description
    );
    if (!result) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
