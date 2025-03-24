import { kafka, kafkaConsumer, kafkaProducer } from "./kafka"; // Import Kafka utilities

export const fetchEngagementData = async (
  ideaIds: number[]
): Promise<Record<number, { likes: number; comments: number }>> => {
  return new Promise(async (resolve, reject) => {
    const correlationId = `engagement-${Date.now()}`; // Unique ID for tracking response
    const topicResponse = `engagement-request-reponse`;
    const consumer = kafka.consumer({ groupId: `dynamic-group-${Date.now()}` });

    try {
      await kafkaProducer.connect();
      // Produce event to Kafka
      await kafkaProducer.send({
        topic: "engagement-request",
        messages: [
          {
            key: correlationId,
            value: JSON.stringify({ ideaIds, responseTopic: topicResponse }),
          },
        ],
      });
      await kafkaProducer.disconnect();

      console.log(
        `📨 Sent engagement request to Kafka for ideaIds: ${ideaIds}`
      );
      await consumer.connect();
      await consumer.subscribe({ topic: topicResponse, fromBeginning: false });
      consumer.run({
        eachMessage: async ({ message }) => {
          console.log(
            `✅ Received engagement data from Kafka: ${message.value?.toString()}`
          );
          const data = JSON.parse(message.value?.toString() || "{}");
          resolve(data);
        },
      });

      // Timeout in case of no response
      //setTimeout(() => reject(new Error("Kafka response timeout")), 10000);
    } catch (error) {
      console.error("❌ Error fetching engagement data:", error);
      reject({});
    }
  });
};
