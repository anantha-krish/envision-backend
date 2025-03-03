import { Kafka, Partitioners, logLevel } from 'kafkajs';
import dotenv from 'dotenv';
dotenv.config();

const kafka = new Kafka({
  clientId: "user-service",
  brokers: [process.env.KAFKA_BROKER||'localhost:9092'],
  logLevel: logLevel.ERROR
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});
producer.on('producer.connect', () => {
  console.log('Kafka producer connected');
});
const sendKafkaUserEvent = async (event: string, data: object) => {
  await producer.connect();
  await producer.send({
    topic: "user-events",
    messages: [{ key: event, value: JSON.stringify(data) }],
  });
  await producer.disconnect();
};

export { sendKafkaUserEvent };
