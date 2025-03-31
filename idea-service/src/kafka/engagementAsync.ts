import { kafka } from "./kafka";
import { EventEmitter } from "events";

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "idea-service-group" });

const eventEmitter = new EventEmitter(); // Event-based tracking

// Start Consumer Once
async function startConsumer() {
  await consumer.connect();
  await consumer.subscribe({
    topic: "engagement-metrics-response",
    fromBeginning: false,
  });

  consumer.run({
    eachMessage: async ({ message }) => {
      const correlationId = message.key?.toString();
      if (correlationId) {
        console.log(
          `✅ Engagement data received for ${correlationId}: ${message.value?.toString()}`
        );
        eventEmitter.emit(
          correlationId,
          JSON.parse(message.value?.toString() || "{}")
        );
      }
    },
  });
}

// Ensure consumer starts once at service launch
startConsumer().catch(console.error);

export async function getEngagementMetrics(
  ideaIds: number[]
): Promise<{ ideaId: number; likes: number; comments: number }[]> {
  return new Promise(async (resolve, reject) => {
    const correlationId = `engage-metrics-${Date.now()}`;

    // Listen for response event
    eventEmitter.once(correlationId, (data) => resolve(data));

    // Send request via Kafka Producer
    await producer.connect();
    await producer.send({
      topic: "engagement-metrics-request",
      messages: [{ key: correlationId, value: JSON.stringify({ ideaIds }) }],
    });
    await producer.disconnect();

    // Timeout handling (reject if no response in 5s)
    setTimeout(() => {
      eventEmitter.removeAllListeners(correlationId);
      reject(new Error("Kafka response timeout"));
    }, 10000);
  });
}
