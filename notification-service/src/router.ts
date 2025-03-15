import express, { Request, Response } from "express";
import { db } from "./db/db.connection";
import { individualNotifications, aggregatedNotifications } from "./db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getUnreadCount, markAllAsRead } from "./redis_client";

const router = express.Router();

// ✅ Mark all notifications as read for a user
router.post("/mark-read/:userId?", async (req: Request, res: Response) => {
  const userId = req.params.userId ?? (req.headers.user_id as string);
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(individualNotifications)
        .set({ isRead: true })
        .where(eq(individualNotifications.userId, +userId));
      await tx
        .update(aggregatedNotifications)
        .set({ isRead: true })
        .where(eq(aggregatedNotifications.userId, +userId));
    });

    // Reset unread count in Redis
    await markAllAsRead(userId);

    res.json({ message: "Notifications marked as read" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:userId?", async (req, res) => {
  const userId = req.params.userId ?? (req.headers.user_id as string);
  const limit = parseInt(req.query.limit as string) || 5;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const unreadCount = await getUnreadCount(userId);

    // Fetch Aggregated Notifications
    const aggregated = await db
      .select()
      .from(aggregatedNotifications)
      .where(eq(aggregatedNotifications.userId, +userId))
      .orderBy(desc(aggregatedNotifications.updatedAt))
      .limit(limit)
      .offset(offset);

    // Fetch Individual Notifications
    const individual = await db
      .select()
      .from(individualNotifications)
      .where(eq(individualNotifications.userId, +userId))
      .orderBy(desc(individualNotifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalAggregated = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(aggregatedNotifications)
      .where(eq(aggregatedNotifications.userId, +userId));

    const totalIndividual = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(individualNotifications)
      .where(eq(individualNotifications.userId, +userId));

    const total =
      Number(totalAggregated[0].count) + Number(totalIndividual[0].count);

    res.json({
      unreadCount: unreadCount || 0,
      notifications: [...aggregated, ...individual],
      total,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
