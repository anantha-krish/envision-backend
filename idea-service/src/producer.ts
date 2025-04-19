import { Kafka, logLevel } from "kafkajs";
import { KAFKA_BROKER } from "./config";

export const kafka = new Kafka({
  clientId: "idea-service",
  brokers: [KAFKA_BROKER || "localhost:9092"],
  logLevel: logLevel.ERROR,
});

export const producer = kafka.producer();

type KafkaUserMessage = {
  actorId: number;
  ideaId?: number;
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

export const sendStatusUpdate = async (data: KafkaUserMessage) => {
  await _sendKafkaUserEvent("notify-idea", "STATUS_CHANGE_EVENT", {
    type: "STATUS_CHANGE",
    ...data,
  });
};
