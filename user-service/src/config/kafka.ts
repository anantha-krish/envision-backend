import { Kafka, logLevel } from "kafkajs";
import { KAFKA_BROKER } from ".";

const kafka = new Kafka({
  clientId: "user-service",
  brokers: [KAFKA_BROKER || "localhost:9092"],
  logLevel: logLevel.ERROR,
});

const producer = kafka.producer();

producer.on("producer.connect", () => {
  console.log("Kafka producer connected");
});

type KafkaUserMessage = {
  userId?: number;
  //  ideaId?: number;
  messageText: string;
};

const _sendKafkaUserEvent = async (
  topic: string,
  event: string,
  data: KafkaUserMessage
) => {
  await producer.connect();
  await producer.send({
    topic: topic,
    messages: [{ key: event, value: JSON.stringify(data) }],
  });
  await producer.disconnect();
};

export const sendUserUpdateEvent = async (data: KafkaUserMessage) =>
  await _sendKafkaUserEvent("notify-user", "USER_PROFILE_UPDATED", data);
