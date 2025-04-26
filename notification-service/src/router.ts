import express, { Request, Response } from "express";
import { db } from "./db/db.connection";
import {
  individualNotifications,
  aggregatedNotifications,
  notificationRecipients,
  notificationActors,
} from "./db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { getUnreadCount, markAllAsRead } from "./redis_client";
import { notifyClient } from "../ws_server";

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
        .set({ isRead: true })
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

    // 🔹 Fetch Aggregated Notifications
    const aggregated = await db
      .select({
        id: aggregatedNotifications.id,
        ideaId: aggregatedNotifications.ideaId,
        type: aggregatedNotifications.type,
        count: aggregatedNotifications.count,
        updatedAt: aggregatedNotifications.updatedAt,

        isRead:
          sql<boolean>`COALESCE(${notificationRecipients.isRead}, false)`.as(
            "is_read"
          ),
      })
      .from(aggregatedNotifications)
      .leftJoin(
        notificationRecipients,
        eq(aggregatedNotifications.id, notificationRecipients.notificationId)
      )
      .where(eq(notificationRecipients.userId, +userId))
      .orderBy(desc(aggregatedNotifications.updatedAt))
      .limit(limit)
      .offset(offset);

    // 🔹 Fetch Notification Actors (Users Who Engaged)
    const actorsMap = new Map<number, number[]>(); // Map aggregatedNotificationId -> array of actorIds
    const actors = await db
      .select({
        notificationId: notificationActors.notificationId,
        actorId: notificationActors.actorId,
      })
      .from(notificationActors);

    // Collect actor IDs per notification
    actors.forEach(({ notificationId, actorId }) => {
      if (!actorsMap.has(notificationId)) {
        actorsMap.set(notificationId, []);
      }
      actorsMap.get(notificationId)!.push(actorId);
    });

    const actionMap: Record<string, string> = {
      LIKE: "liked the idea",
      COMMENT: "commented on the idea",
      STATUS_CHANGE: "has updated the status",
      FILE_ADDED: "has updated the attachments",
    };

    // 🔹 Transform Aggregated Notifications
    const transformedAggregated = aggregated.map((notif) => {
      const actorIds = actorsMap.get(notif.id) || [];
      const action = actionMap[notif.type] || notif.type.toLowerCase();
      const message =
        actorIds.length === 1
          ? `%USER-${actorIds[0]}% ${action}. `
          : `%USER-${actorIds[0]}% and ${
              actorIds.length - 1
            } others ${action}.`;
      return {
        id: `AGG-${notif.id}`, // Prefix with "AGG-"
        category: "aggregated",
        ideaId: notif.ideaId,
        type: notif.type,
        actorIds, // Store all actor userIds
        message: message,

        count: notif.count,
        updatedAt: notif.updatedAt,
        isRead: notif.isRead,
      };
    });

    const total = transformedAggregated.length;

    res.json({
      unreadCount: unreadCount || 0,
      notifications: transformedAggregated, // Only aggregated notifications
      total,
      hasMore: offset + limit < total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

router.post("/test-socket-server/:userId?", (req, res) => {
  const userId = req.params.userId ?? (req.headers.user_id as string);
  const mockCount = req.body.count ?? 3;
  if (!userId) {
    res.status(400).json({ error: "User ID is required" });
    return;
  }
  notifyClient(+userId, { type: "unread_count", payload: mockCount });
  res.json({ message: `Notification sent to ${userId}` });
});

export default router;
