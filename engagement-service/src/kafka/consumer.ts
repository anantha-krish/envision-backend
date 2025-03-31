import { eq, inArray, sql, and } from "drizzle-orm";
import { db } from "../db/db.connection";
import { comments, likes } from "../db/schema";
import {
  mgetEngagements,
  updateEngagementStats,
  updatePopularity,
  updateTrendingScore,
} from "../redis_client";
import { kafka } from "./producer";

const engagementConsumer = kafka.consumer({
  groupId: "engagement-service-group",
});
const engagementEventsConsumer = kafka.consumer({
  groupId: "engagement-events-group",
});
export const processEngagementEvents = async () => {
  try {
    await engagementEventsConsumer.subscribe({ topic: "engagement-events" });

    await engagementEventsConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const { ideaId, type } = JSON.parse(message.value.toString());

        let score = 0;
        if (type === "LIKE") score = 5;
        if (type === "COMMENT") score = 10;
        if (type === "VIEW") score = 1;

        await updatePopularity(ideaId, score);
        await updateTrendingScore(ideaId, score);
      },
    });
  } catch {}
};

export const processEngagementRequest = async () => {
  try {
    await engagementConsumer.connect();
    await engagementConsumer.subscribe({
      topic: "engagement-request",
      fromBeginning: false,
    });
    // Subscribe to Kafka topic

    await engagementConsumer.run({
      eachMessage: async ({ message }) => {
        try {
          if (!message.value) return;

          const { ideaIds, responseTopic } = JSON.parse(
            message.value.toString()
          );
          console.log(`📥 Received engagement request for ideaIds: ${ideaIds}`);

          const engagementData: Record<
            number,
            { likes: number; comments: number }
          > = {};

          // 1️⃣ Fetch from Redis first

          const redisValues = await mgetEngagements(ideaIds);

          const missingIdeaIds: number[] = [];

          ideaIds.forEach((id, index) => {
            if (redisValues[index]) {
              engagementData[id] = JSON.parse(redisValues[index]!);
            } else {
              missingIdeaIds.push(id);
            }
          });

          // 2️⃣ Fetch missing data from DB if needed
          if (missingIdeaIds.length > 0) {
            const likesQuery = db
              .select({
                ideaId: likes.ideaId,
                likes: sql<number>`COUNT(DISTINCT ${likes.userId})`,
              })
              .from(likes)
              .where(inArray(likes.ideaId, missingIdeaIds))
              .groupBy(likes.ideaId);

            const commentsQuery = db
              .select({
                ideaId: comments.ideaId,
                comments: sql<number>`COUNT(DISTINCT ${comments.id})`,
              })
              .from(comments)
              .where(inArray(comments.ideaId, missingIdeaIds))
              .groupBy(comments.ideaId);

            // Merge results in JS
            const [likesResults, commentsResults] = await Promise.all([
              likesQuery,
              commentsQuery,
            ]);

            const engagementMap = new Map<
              number,
              { likes: number; comments: number }
            >();

            likesResults.forEach(({ ideaId, likes }) => {
              engagementMap.set(ideaId, { likes, comments: 0 });
            });

            commentsResults.forEach(({ ideaId, comments }) => {
              if (engagementMap.has(ideaId)) {
                engagementMap.get(ideaId)!.comments = comments;
              } else {
                engagementMap.set(ideaId, { likes: 0, comments });
              }
            });

            const finalResults = Array.from(
              engagementMap,
              ([ideaId, data]) => ({
                ideaId,
                ...data,
              })
            );

            const redisUpdates: [string, string][] = [];

            finalResults.forEach(({ ideaId, likes, comments }) => {
              engagementData[ideaId] = { likes, comments };
              redisUpdates.push([
                `engagement:${ideaId}`,
                JSON.stringify({ likes, comments }),
              ]);
            });

            // 3️⃣ Update Redis for future requests
            await updateEngagementStats(redisUpdates);
          }
          await producer.connect();
          // 4️⃣ Publish response to Kafka
          await producer.send({
            topic: "engagement-request-reponse",
            messages: [
              {
                value: JSON.stringify(engagementData),
              },
            ],
          });
          await producer.disconnect();

          console.log(`📤 Sent engagement data back via Kafka`);
        } catch (error) {
          console.error("❌ Error processing engagement request:", error);
        }
      },
    });

    console.log("✅ Kafka engagement consumer is running...");
  } catch (error) {
    console.error("❌ Failed to subscribe to Kafka topic:", error);
  }
};

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "engagement-service-group" });

export async function processEngagementMetricsRequests() {
  await consumer.connect();
  await producer.connect();
  await consumer.subscribe({
    topic: "engagement-metrics-request",
    fromBeginning: false,
  });

  consumer.run({
    eachMessage: async ({ message }) => {
      const correlationId = message.key?.toString();
      const { ideaIds } = JSON.parse(message.value?.toString() || "{}");

      // Fetch counts from DB
      const engagementData = await db
        .select({
          ideaId: likes.ideaId,
          likes: sql<number>`COUNT(DISTINCT ${likes.userId})`,
          comments: sql<number>`COUNT(DISTINCT ${comments.id})`,
        })
        .from(likes)
        .leftJoin(comments, and(eq(comments.ideaId, likes.ideaId)))
        .where(inArray(likes.ideaId, ideaIds))
        .groupBy(likes.ideaId);

      // Send response
      await producer.send({
        topic: "engagement-metrics-response",
        messages: [
          { key: correlationId, value: JSON.stringify(engagementData) },
        ],
      });
    },
  });
}
