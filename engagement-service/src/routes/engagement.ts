import { Request, Response, Router } from "express";
import { db } from "../db/db.connection";
import { likes, comments } from "../db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { z } from "zod";
import { sendNewCommentEvent, sendNewLikeEvent } from "../kafka/producer";
import { fetchEngagementMetrics } from "../repo";

const router = Router();

// Like an Idea
router.post("/likes/:ideaId", async (req: Request, res: Response) => {
  const userId = parseInt((req.headers.user_id as string) ?? "-1");
  const ideaId = parseInt(req.params.ideaId ?? "-1");

  const existingLike = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.ideaId, ideaId)));

  if (existingLike.length > 0) {
    res.status(400).json({ message: "Already liked" });
    return;
  }

  await db.insert(likes).values({ userId, ideaId });
  await sendNewLikeEvent({
    actorId: userId,
    ideaId,
    messageText: `User: ${userId} liked Idea-${ideaId} `,
  });
  res.status(201).json({ message: "Liked successfully" });
});

// Unlike an Idea
router.delete("/likes/:ideaId", async (req: Request, res: Response) => {
  const userId = parseInt((req.headers.user_id as string) ?? "-1");
  const ideaId = parseInt(req.params.ideaId ?? "-1");

  await db
    .delete(likes)
    .where(and(eq(likes.userId, userId), eq(likes.ideaId, ideaId)));

  res.status(200).json({ message: "Unliked successfully" });
});

// Get Total Likes
router.get("/likes/:ideaId", async (req: Request, res: Response) => {
  const ideaId = parseInt(req.params.ideaId ?? "-1");
  const totalLikes = await db
    .select()
    .from(likes)
    .where(eq(likes.ideaId, ideaId));
  res.json({ likes: totalLikes.length });
});

// Add a Comment
router.post("/comments/:ideaId", async (req: Request, res: Response) => {
  const userId = parseInt((req.headers.user_id as string) ?? "-1");
  const ideaId = parseInt(req.params.ideaId ?? "-1");
  const schema = z.object({
    content: z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error);
    return;
  }

  const { content } = parsed.data;

  await db.insert(comments).values({ userId, ideaId, content });
  await sendNewCommentEvent({
    actorId: userId,
    ideaId,
    messageText:
      content.length > 50 ? content.substring(0, 50).concat("...") : content,
  });
  res.status(201).json({ message: "Comment added" });
});

// Get Comments (Latest 5, Paginated)
router.get("/comments/:ideaId", async (req: Request, res: Response) => {
  const { ideaId } = req.params;
  const { page = 1, limit = 5 } = req.query;

  const commentList = await db
    .select()
    .from(comments)
    .where(eq(comments.ideaId, parseInt(ideaId ?? "-1")))
    .orderBy(comments.createdAt)
    .offset((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ comments: commentList });
});

// Delete a Comment
router.delete("/comments/:commentId", async (req: Request, res: Response) => {
  const { commentId } = req.params;
  await db.delete(comments).where(eq(comments.id, parseInt(commentId ?? "-1")));
  res.status(200).json({ message: "Comment deleted" });
});

router.get("/metrics", async (req: Request, res: Response) => {
  try {
    const ideaIds = (req.query.ideaIds as String)?.split(",").map(Number);

    if (!ideaIds || ideaIds.length === 0) {
      res.status(400).json({ error: "Missing or invalid ideaIds parameter" });
      return;
    }
    var metricsMap = await fetchEngagementMetrics(ideaIds);
    res.json(metricsMap);
  } catch (error) {
    console.error("Error fetching engagement metrics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
