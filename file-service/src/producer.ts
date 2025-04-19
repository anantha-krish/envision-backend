import { Kafka, logLevel } from "kafkajs";
import { KAFKA_BROKER } from "./config/env";

export const kafka = new Kafka({
  clientId: "file-service",
  brokers: [KAFKA_BROKER || "localhost:9092"],
  logLevel: logLevel.ERROR,
});

export const producer = kafka.producer();

type KafkaUserMessage = {
  actorId: number;
  ideaId: number;
  type?: string;
  recipients: number[];
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

export const sendFileAddedUpdate = async (data: KafkaUserMessage) => {
  await _sendKafkaUserEvent("notify-idea", "FILE_CHANGE_EVENT", {
    type: "FILE_ADDED",
    ...data,
  });
};
export const sendFileDeletedUpdate = async (data: KafkaUserMessage) => {
  await _sendKafkaUserEvent("notify-idea", "FILE_CHANGE_EVENT", {
    type: "FILE_REMOVED",
    ...data,
  });
};
