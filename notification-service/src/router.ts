import express from "express";
import { db } from "./db/db.connection";
import { notifications } from "./db/schema";
import { eq, desc, count } from "drizzle-orm";
import { getUnreadCount, markAllAsRead } from "./redis_client";

const router = express.Router();

router.post("/mark-read/:userId?", async (req, res) => {
  const userIdentity = req.params.userId ?? (req.headers.user_id as string);
  try {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, parseInt(userIdentity)));

    // Reset unread count in Redis
    await markAllAsRead(userIdentity);

    res.json({ message: "Notifications marked as read" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch user notifications
router.get("/:userId?", async (req, res) => {
  const userIdentity = req.params.userId ?? (req.headers.user_id as string);
  const limit = parseInt(req.query.limit as string) || 5;
  const offset = parseInt(req.query.offset as string) || 0;
  if (!userIdentity) {
    res.status(404);
    return;
  }
  try {
    const unreadCount = await getUnreadCount(userIdentity);
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, parseInt(userIdentity)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    const total = await db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.userId, parseInt(userIdentity)));

    res.status(200).json({
      unreadCount: unreadCount || 0,
      notifications: userNotifications,
      total: total[0].count,
      hasMore: offset + limit < total[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

export default router;
