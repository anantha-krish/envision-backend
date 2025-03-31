import { sql, and, eq, inArray, countDistinct } from "drizzle-orm";
import { kafka } from "./producer";
import { db } from "../db/db.connection";
import { comments, likes } from "../db/schema";
import { fetchEngagementMetrics } from "../repo";

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "engagement-service-group" });

export async function processEngagementMetricsRequests() {
  try {
    await producer.connect();
    await consumer.connect();

    await consumer.subscribe({
      topic: "engagement-metrics-request",
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const correlationId = message.key?.toString();
          if (!correlationId) return;

          const { ideaIds } = JSON.parse(message.value?.toString() || "{}");

          console.log(`📥 Received engagement request for ideaIds: ${ideaIds}`);

          const engagementData = await fetchEngagementMetrics(ideaIds);

          await producer.send({
            topic: "engagement-metrics-response",
            messages: [
              { key: correlationId, value: JSON.stringify(engagementData) },
            ],
          });

          console.log(
            `📤 Sent engagement data: ${JSON.stringify(engagementData)}`
          );
        } catch (error) {
          console.error("❌ Error processing Kafka message:", error);
        }
      },
    });

    console.log("🚀 Kafka consumer is running...");
  } catch (error) {
    console.error("❌ Error setting up Kafka:", error);
  }
}
