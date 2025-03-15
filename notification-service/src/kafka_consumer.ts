import { Kafka } from "kafkajs";
import { db } from "./db/db.connection";
import {
  individualNotifications,
  aggregatedNotifications,
  notificationActors,
  notificationRecipients,
} from "./db/schema";
import { updateUnreadCount } from "./redis_client";
import { and, eq, sql } from "drizzle-orm";
import { notifyClient } from "../ws_server";

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "notification-group" });

export const consumeMessages = async () => {
  await consumer.connect();
  await consumer.subscribe({
    topics: ["notify-user", "notify-idea", "notify-engagement"],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value?.toString() || "{}");
      const { actorId, ideaId, type, recipients = [], messageText } = data;

      console.log(`Received: ${JSON.stringify(data)}`);

      await db.transaction(async (tx) => {
        for (const userId of recipients) {
          // Insert individual notification
          await tx.insert(individualNotifications).values({
            userId,
            ideaId,
            actorId,
            type,
            message: messageText,
          });

          // Check if an aggregated notification exists for this idea & type
          const existingAggregate = await tx
            .select()
            .from(aggregatedNotifications)
            .where(
              and(
                eq(aggregatedNotifications.ideaId, ideaId),
                eq(aggregatedNotifications.type, type)
              )
            )
            .limit(1);

          let aggregatedNotificationId;

          if (existingAggregate.length > 0) {
            // Update existing aggregated notification
            aggregatedNotificationId = existingAggregate[0].id;
            await tx
              .update(aggregatedNotifications)
              .set({
                count: sql`${aggregatedNotifications.count} + 1`,
                updatedAt: sql`now()`,
              })
              .where(eq(aggregatedNotifications.id, aggregatedNotificationId));
          } else {
            // Insert new aggregated notification
            const insertedAggregate = await tx
              .insert(aggregatedNotifications)
              .values({
                ideaId,
                type,
                count: 1,
              })
              .returning({ id: aggregatedNotifications.id });
            aggregatedNotificationId = insertedAggregate[0].id;
          }

          // Insert actor into `notificationActors` if not already present
          const existingActor = await tx
            .select()
            .from(notificationActors)
            .where(
              and(
                eq(notificationActors.notificationId, aggregatedNotificationId),
                eq(notificationActors.actorId, actorId)
              )
            )
            .limit(1);

          if (existingActor.length === 0) {
            await tx.insert(notificationActors).values({
              notificationId: aggregatedNotificationId,
              actorId,
            });
          }

          // Insert recipient into `notificationRecipients` if not already present
          const existingRecipient = await tx
            .select()
            .from(notificationRecipients)
            .where(
              and(
                eq(
                  notificationRecipients.notificationId,
                  aggregatedNotificationId
                ),
                eq(notificationRecipients.userId, userId)
              )
            )
            .limit(1);

          if (existingRecipient.length === 0) {
            await tx.insert(notificationRecipients).values({
              notificationId: aggregatedNotificationId,
              userId,
              isRead: false,
            });
          }
        }
      });

      // Update Redis unread count
      recipients.forEach((userId) => updateUnreadCount(userId));

      // Notify WebSocket clients
      recipients.forEach((userId) =>
        notifyClient(userId, { type, ideaId, actorId })
      );
    },
  });
};
