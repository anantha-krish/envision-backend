import { Request, Response } from "express";
import {
  ideaRepo,
  SortOption,
  SortOrder,
  validSortOptions,
} from "../src/repo/ideasRepo";
import { mgetViews, storeIdeaCreation } from "../src/redis_client";
import { db } from "../src/db/db.connection";
import { tags } from "../src/db/schema";
import { inArray, eq } from "drizzle-orm";
import { sendStatusUpdate } from "../src/producer";

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

export const createTag = async (req: Request, res: Response) => {
  try {
    const { tagName } = req.body;

    if (!tagName || typeof tagName !== "string" || !tagName.trim()) {
      res.status(400).json({ message: "tagName is required" });
      return;
    }

    // Optional: Check for duplicates
    const existing = await db
      .select()
      .from(tags)
      .where(eq(tags.name, tagName.trim()));

    if (existing.length > 0) {
      res.status(409).json({ message: "Tag already exists" });
      return;
    }

    const [newTag] = await db
      .insert(tags)
      .values({
        name: tagName.trim(),
      })
      .returning();

    res.status(201).json(newTag);
  } catch (error) {
    console.error("Error creating tag:", error);
    res.status(500).json({ message: "Failed to create tag" });
  }
};

export const getTags = async (req: Request, res: Response) => {
  try {
    const tagIdsParam = req.query.tagIds as string | null;

    const tagIds = tagIdsParam
      ?.split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => !isNaN(id));

    const result =
      tagIds?.length ?? 0 > 0
        ? await db.select().from(tags).where(inArray(tags.id, tagIds!))
        : await db.select().from(tags);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ message: "Failed to fetch tags" });
  }
};

// Get all ideas
export const getAllIdeas = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 10);
    const sortByQuery = req.query.sortBy as string | undefined;
    const sortOrderQuery = req.query.sortOrder;
    const sortOrder = ["ASC", "DESC"].includes(sortOrderQuery as SortOrder)
      ? (sortOrderQuery as SortOrder)
      : "DESC";
    const sortBy: SortOption = validSortOptions.includes(
      sortByQuery as SortOption
    )
      ? (sortByQuery as SortOption)
      : "recent";

    const ideasList = await ideaRepo.getAllIdeas(
      page,
      pageSize,
      sortBy,
      sortOrder
    );
    if (ideasList.length === 0) {
      res.status(200).json({});
      return;
    }

    const ideaIds = ideasList.map((idea) => idea.id);

    const tagResults = await ideaRepo.fetchTagsForIdeas(ideaIds);

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
      };
    });
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
    const userId = parseInt((req.headers.user_id as string) ?? "-1");
    const recipients = Array.from(
      new Set([...req.body.recipients, ...(userId > -1 ? [userId] : [])])
    );
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
    const status = await ideaRepo.getStatusName(statusId);

    sendStatusUpdate({
      actorId: userId,
      ideaId: ideaId,
      recipients: recipients,
      messageText: `IDEA-${ideaId} status has been changed to %${status}%`,
    });

    res.status(200).json({
      message: "Idea status updated successfully",
      idea: { updatedIdea, status },
    });
  } catch (error) {
    console.error("Error updating idea status:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
};
