import { Kafka } from "kafkajs";
import { KAFKA_BROKER } from "../config";

export const kafka = new Kafka({
  clientId: "idea-service",
  brokers: [KAFKA_BROKER],
});
export const kafkaProducer = kafka.producer();
export const kafkaConsumer = kafka.consumer({ groupId: "idea-service-group" });
