import { Kafka } from "kafkajs";
import { db } from "./db/db.connection";
import { individualNotifications, aggregatedNotifications } from "./db/schema";
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
      const { actorId, ideaId, type } = data; // recipients = [userId1, userId2]
      console.log(`recieved${JSON.stringify(data)}`);
      //TODO fetch participants of idea
      var recipients = data.recipients ?? [1, 2];

      for (const userId of recipients) {
        const existingAggregate = await db
          .select()
          .from(aggregatedNotifications)
          .where(
            and(
              eq(aggregatedNotifications.userId, userId),
              eq(aggregatedNotifications.ideaId, ideaId),
              eq(aggregatedNotifications.type, type)
            )
          )
          .limit(1);

        if (existingAggregate.length > 0) {
          // Update aggregated record
          await db
            .update(aggregatedNotifications)
            .set({
              actorIds: sql`${aggregatedNotifications.actorIds} || ${actorId}`,
              count: sql`${aggregatedNotifications.count} + 1`,
              updatedAt: sql`now()`,
            })
            .where(eq(aggregatedNotifications.id, existingAggregate[0].id));
        } else {
          // Insert a new aggregate record
          await db.insert(aggregatedNotifications).values({
            userId,
            ideaId,
            type,
            actorIds: [actorId],
            count: 1,
          });
        }
      }

      // Update Redis unread count
      recipients.forEach((userId) => updateUnreadCount(userId));

      // Notify WebSocket clients
      recipients.forEach((userId) =>
        notifyClient(userId, { type, ideaId, actorId })
      );
    },
  });
};
