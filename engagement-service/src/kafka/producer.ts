import { Kafka, logLevel } from "kafkajs";
import { KAFKA_BROKER } from "../config";

const kafka = new Kafka({
  clientId: "engagement-service",
  brokers: [KAFKA_BROKER || "localhost:9092"],
  logLevel: logLevel.ERROR,
});

const producer = kafka.producer();

type KafkaUserMessage = {
  actorId: number;
  ideaId?: number;
  type?: string;
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

export const sendNewLikeEvent = async (data: KafkaUserMessage) =>
  await _sendKafkaUserEvent("notify-engagement", "NEW_LIKE_EVENT", {
    type: "LIKE",
    ...data,
  });

export const sendNewCommentEvent = async (data: KafkaUserMessage) =>
  await _sendKafkaUserEvent("notify-engagement", "NEW_COMMENT_EVENT", {
    type: "COMMENT",
    ...data,
  });
