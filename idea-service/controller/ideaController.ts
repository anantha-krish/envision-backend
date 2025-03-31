import { Request, Response } from "express";
import { ideaRepo } from "../src/repo/ideasRepo";
import { mgetViews, storeIdeaCreation } from "../src/redis_client";
import { getEngagementMetrics } from "../src/kafka/engagementAsync";

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
  var userId = Number(req.headers.user_id ?? 0);
  var updatedSubmittedBy: number[] = submittedBy;
  try {
    if (updatedSubmittedBy.length == 0) {
      updatedSubmittedBy = [userId];
    } else if (!submittedBy.includes[userId]) {
      updatedSubmittedBy = [userId, ...updatedSubmittedBy];
    }
    const result = await ideaRepo.createIdea(
      title,
      summary,
      description,
      managerId,
      statusId,
      tags || [],
      submittedBy?.length > 0 ? submittedBy : [req.headers.user_id]
    );
    await storeIdeaCreation(
      result.ideaId,
      result.createdAt?.toDateString() ?? "0"
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Get all ideas
export const getAllIdeas = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 10);
    const sortBy = req.query.sortBy ? (req.query.sortBy as string) : "recent";
    const ideasList = await ideaRepo.getAllIdeas(page, pageSize, sortBy);
    if (ideasList.length === 0) {
      res.status(200).json({});
      return;
    }

    const ideaIds = ideasList.map((idea) => idea.id);

    const tagResults = await ideaRepo.fetchTagsForIdeas(ideaIds);

    // Fetch views from Redis
    const viewCounts = await mgetViews(ideaIds);

    // Fetch likes & comments via API Gateway (Engagement Service)
    const engagementMetrics: Record<any, any>[] = await getEngagementMetrics(
      ideaIds
    );

    // Process tags mapping
    const tagsMap: Record<number, string[]> = {};
    tagResults.forEach(({ ideaId, tagName }) => {
      if (!tagsMap[ideaId]) tagsMap[ideaId] = [];
      tagsMap[ideaId].push(tagName);
    });

    const finalResults = ideasList.map((idea, index) => {
      return {
        ...idea,
        tags: tagsMap[idea.id] || [],
        views: viewCounts[index] ? parseInt(viewCounts[index] || "0") : 0,
        likes: engagementMetrics[idea.id]?.likes || 0,
        comments: engagementMetrics[idea.id]?.comments || 0,
      };
    });

    // Step 8: Apply sorting based on user input
    switch (sortBy) {
      case "popular":
        finalResults.sort(
          (a, b) => b.likes + b.comments - (a.likes + a.comments)
        );
        break;
      case "views":
        finalResults.sort((a, b) => b.views - a.views);
        break;
      case "trending":
        finalResults.sort(
          (a, b) =>
            (b.likes + b.comments) / (Date.now() - b.createdAt.getTime()) -
            (a.likes + a.comments) / (Date.now() - a.createdAt.getTime())
        );
        break;

      case "recent":
        finalResults.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        break;

      default:
        break; // Default to no sorting if invalid input
    }

    res.status(200).json(finalResults);
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
export const getIdeaDetails = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await ideaRepo.getIdeaById(Number(id));
    if (!result) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateIdeaStatus = async (req: Request, res: Response) => {
  try {
    const ideaId = Number(req.params.id ?? "-1");
    const { statusId } = req.body;

    if (!ideaId || !statusId) {
      res.status(400).json({ error: "ideaId and statusId are required" });
      return;
    }

    const updatedIdea = await ideaRepo.updateIdeaStatus(ideaId, statusId);

    if (!updatedIdea) {
      res.status(404).json({ error: "Idea not found" });
      return;
    }

    res
      .status(200)
      .json({ message: "Idea status updated successfully", idea: updatedIdea });
  } catch (error) {
    console.error("Error updating idea status:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
};
