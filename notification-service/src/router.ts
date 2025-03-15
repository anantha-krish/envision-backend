import express, { Request, Response } from "express";
import { db } from "./db/db.connection";
import {
  individualNotifications,
  aggregatedNotifications,
  notificationRecipients,
} from "./db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getUnreadCount, markAllAsRead } from "./redis_client";

const router = express.Router();
router.post("/mark-read/:userId?", async (req: Request, res: Response) => {
  const userId = req.params.userId ?? (req.headers.user_id as string);
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      // Mark individual notifications as read
      await tx
        .update(individualNotifications)
        .set({ isRead: true })
        .where(eq(individualNotifications.userId, +userId));

      // Mark aggregated notifications as read for this user
      await tx
        .update(notificationRecipients)
        .set({ isRead: true, updatedAt: sql`now()` })
        .where(eq(notificationRecipients.userId, +userId));
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

    // Fetch Aggregated Notifications with Read Status for the Recipient
    const aggregated = await db
      .select({
        id: aggregatedNotifications.id,
        ideaId: aggregatedNotifications.ideaId,
        type: aggregatedNotifications.type,
        count: aggregatedNotifications.count,
        updatedAt: aggregatedNotifications.updatedAt,
        isRead: sql<boolean>`CASE 
                      WHEN ${notificationRecipients.isRead} IS NULL THEN false 
                      ELSE ${notificationRecipients.isRead} 
                    END`.as("is_read"),
      })
      .from(aggregatedNotifications)
      .leftJoin(
        notificationRecipients,
        and(
          eq(aggregatedNotifications.id, notificationRecipients.notificationId),
          eq(notificationRecipients.userId, +userId)
        )
      )
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
      .from(notificationRecipients)
      .where(eq(notificationRecipients.userId, +userId));

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
