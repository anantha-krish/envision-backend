import { Kafka } from "kafkajs";
import { db } from "./db/db.connection";
import { notifications } from "./db/schema";
import { updateUnreadCount } from "./redis_client";

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "notification-group" });

export const consumeMessages = async () => {
  await consumer.connect();
  await consumer.subscribe({
    topics: ["notify-user", "notify-idea"],
    fromBeginning: true,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const data = JSON.parse(message.value?.toString() || "{}");
      const { userId, ideaId, messageText } = data;

      // Store in DB
      await db
        .insert(notifications)
        .values({ userId, ideaId, message: messageText });

      // Update Redis unread count
      await updateUnreadCount(userId);
    },
  });
};
