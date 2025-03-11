import express from "express";
import { db } from "./db/db.connection";
import { notifications } from "./db/schema";
import { eq } from "drizzle-orm";
import { getUnreadCount, markAllAsRead } from "./redis_client";

const router = express.Router();

// Fetch user notifications
router.get("/:user_id?", async (req, res) => {
  const userId = req.params.user_id ?? (req.headers.user_id as string);
  if (!userId) {
    res.status(404);
    return;
  }
  try {
    const unreadCount = await getUnreadCount(userId);
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, parseInt(userId)));

    res.status(200).json({
      unreadCount: unreadCount || 0,
      notifications: userNotifications,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal error" });
  }
});

router.get("/test", async (req, res) => {
  res.status(200).json({ messsage: "hello" });
});
router.post("/mark-read", async (req, res) => {
  const { userId } = req.body;

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));

  // Reset unread count in Redis
  await markAllAsRead(userId);

  res.json({ message: "Notifications marked as read" });
});

export default router;
