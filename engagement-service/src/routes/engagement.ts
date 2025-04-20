import { Request, Response, Router } from "express";
import { db } from "../db/db.connection";
import { likes, comments } from "../db/schema";
import { eq, and, sql, inArray, desc } from "drizzle-orm";
import { z } from "zod";
import { sendNewCommentEvent, sendNewLikeEvent } from "../kafka/producer";
import {
  decrementComments,
  decrementLikes,
  incrementComments,
  incrementLikes,
} from "../redis_client";

const router = Router();

router.post("/likes/:ideaId", async (req: Request, res: Response) => {
  const userId = parseInt((req.headers.user_id as string) ?? "-1");
  const ideaId = parseInt(req.params.ideaId ?? "-1");
  const recipients = Array.from(
    new Set([...(req.body.recipients ?? []), ...(userId > -1 ? [userId] : [])])
  );

  const [result] = await db
    .select({
      isLiked: sql<number>`COUNT(*) FILTER (WHERE ${likes.ideaId} = ${ideaId} AND ${likes.userId} = ${userId})`,
    })
    .from(likes);

  const alreadyLiked = result.isLiked > 0;

  if (alreadyLiked) {
    await db
      .delete(likes)
      .where(and(eq(likes.userId, userId), eq(likes.ideaId, ideaId)));

    await decrementLikes(ideaId);

    const [updatedCount] = await db
      .select({
        totalCount: sql<number>`COUNT(*) FILTER (WHERE ${likes.ideaId} = ${ideaId})`,
      })
      .from(likes);

    res.status(200).json({
      liked: false,
      totalCount: updatedCount.totalCount,
      message: "Unliked Successfully",
    });
  } else {
    await db.insert(likes).values({ userId, ideaId });
    await incrementLikes(ideaId);

    await sendNewLikeEvent({
      actorId: userId,
      ideaId,
      recipients,
      messageText: `User: ${userId} liked Idea-${ideaId}`,
    });

    const [updatedCount] = await db
      .select({
        totalCount: sql<number>`COUNT(*) FILTER (WHERE ${likes.ideaId} = ${ideaId})`,
      })
      .from(likes);

    res.status(201).json({
      liked: true,
      totalCount: updatedCount.totalCount,
      message: "Liked Successfully",
    });
  }
});

// Unlike an Idea
router.delete("/likes/:ideaId", async (req: Request, res: Response) => {
  const userId = parseInt((req.headers.user_id as string) ?? "-1");
  const ideaId = parseInt(req.params.ideaId ?? "-1");

  await db
    .delete(likes)
    .where(and(eq(likes.userId, userId), eq(likes.ideaId, ideaId)));
  await decrementLikes(ideaId);
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

router.get("/likes/:ideaId/status", async (req: Request, res: Response) => {
  const userId = parseInt((req.headers.user_id as string) ?? "-1");
  const ideaId = parseInt(req.params.ideaId ?? "-1");

  const [{ count: likeCount }] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(likes)
    .where(and(eq(likes.ideaId, ideaId), eq(likes.userId, userId)));

  res.json({ liked: likeCount > 0 });
});

// Add a Comment
router.post("/comments/:ideaId", async (req: Request, res: Response) => {
  const userId = parseInt((req.headers.user_id as string) ?? "-1");
  const ideaId = parseInt(req.params.ideaId ?? "-1");
  const schema = z.object({
    content: z.string().min(1),
  });

  const recipients = Array.from(
    new Set([...req.body.recipients, ...(userId > -1 ? [userId] : [])])
  );
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(parsed.error);
    return;
  }

  const { content } = parsed.data;

  var [result] = await db
    .insert(comments)
    .values({ userId, ideaId, content })
    .returning();
  await incrementComments(ideaId);
  await sendNewCommentEvent({
    actorId: userId,
    ideaId,
    recipients,
    messageText:
      content.length > 50 ? content.substring(0, 50).concat("...") : content,
  });
  res.status(201).json(result);
});

// Get Comments (Latest 5, Paginated)
router.get("/comments/:ideaId", async (req: Request, res: Response) => {
  const { ideaId } = req.params;
  const { page = 1, limit = 5 } = req.query;

  const commentList = await db
    .select()
    .from(comments)
    .where(eq(comments.ideaId, parseInt(ideaId ?? "-1")))
    .orderBy(desc(comments.createdAt))
    .offset((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.json({ comments: commentList });
});

// Delete a Comment
router.delete("/comments/:commentId", async (req: Request, res: Response) => {
  const { commentId } = req.params;

  var result = await db
    .delete(comments)
    .where(eq(comments.id, parseInt(commentId ?? "-1")))
    .returning({ ideaId: comments.ideaId });

  await decrementComments(result[1].ideaId);

  res.status(200).json({ message: "Comment deleted" });
});

export default router;
