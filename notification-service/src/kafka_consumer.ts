import { Kafka } from "kafkajs";
import { db } from "./db/db.connection";
import {
  individualNotifications,
  aggregatedNotifications,
  notificationActors,
  notificationRecipients,
} from "./db/schema";
import { getUnreadCount, updateUnreadCount } from "./redis_client";
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
      const { actorId, ideaId, type, recipients, messageText } = data;

      const validrecipients = recipients.filter(
        (id): id is number => typeof id === "number" && id > 0
      );

      console.log(`Received: ${JSON.stringify(data)}`);

      await db.transaction(async (tx) => {
        let aggregatedNotificationId: number | null = null;

        // 🔹 Check if an aggregated notification exists
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

        if (existingAggregate.length > 0) {
          aggregatedNotificationId = existingAggregate[0].id;
          await tx
            .update(aggregatedNotifications)
            .set({
              count: sql`${aggregatedNotifications.count} + 1`,
              updatedAt: sql`now()`,
            })
            .where(eq(aggregatedNotifications.id, aggregatedNotificationId));
        } else {
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

        for (const userId of validrecipients) {
          // 🛑 Check if the individual notification already exists
          const existingIndividual = await tx
            .select()
            .from(individualNotifications)
            .where(
              and(
                eq(individualNotifications.userId, userId),
                eq(individualNotifications.ideaId, ideaId),
                eq(individualNotifications.actorId, actorId),
                eq(individualNotifications.type, type)
              )
            )
            .limit(1);

          let individualNotificationId: number | null = null;

          if (existingIndividual.length === 0) {
            // ✅ Insert individual notification and return ID
            const insertedIndividual = await tx
              .insert(individualNotifications)
              .values({
                userId,
                ideaId,
                actorId,
                type,
                message: messageText,
              })
              .returning({ id: individualNotifications.id });

            individualNotificationId = insertedIndividual[0].id;
          } else {
            individualNotificationId = existingIndividual[0].id;
          }

          // 🔹 Check and insert actor into `notificationActors`
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

          // 🔹 Check and insert recipient into `notificationRecipients`
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

          console.log(
            `Notification processed for user ${userId}: Individual ID = ${individualNotificationId}, Aggregated ID = ${aggregatedNotificationId}`
          );
        }
      });

      await Promise.all(
        validrecipients.map(async (userId: number) => {
          var _id = userId.toString();
          await updateUnreadCount(_id);
          const count = await getUnreadCount(_id);
          notifyClient(userId, { type: "unread_count", payload: count });
        })
      );
    },
  });
};
