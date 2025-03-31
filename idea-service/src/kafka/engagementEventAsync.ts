import { eq, sql } from "drizzle-orm";
import { db } from "../db/db.connection";
import { ideas } from "../db/schema";
import { kafka } from "./kafka";
import { EventEmitter } from "events";

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "idea-service-group" });

const eventEmitter = new EventEmitter(); // Event-based tracking

// Start Consumer Once
export async function startConsumer2() {
  await consumer.connect();
  await consumer.subscribe({
    topic: "engagement-events",
    fromBeginning: false,
  });

  consumer.run({
    eachMessage: async ({ message }) => {
      const { ideaId, type } = JSON.parse(message?.value?.toString() ?? "{}");

      if (type === "like") {
        await db
          .update(ideas)
          .set({ likesCount: sql`${ideas.likesCount} + 1` })
          .where(eq(ideas.id, ideaId));
      } else if (type === "comment") {
        await db
          .update(ideas)
          .set({ commentsCount: sql`${ideas.commentsCount} + 1` })
          .where(eq(ideas.id, ideaId));
      }
    },
  });
}
