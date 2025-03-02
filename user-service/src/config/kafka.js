const { Kafka, Partitioners, logLevel } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: "user-service",
  brokers: [process.env.KAFKA_BROKER],
  logLevel: logLevel.ERROR
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});
producer.on('producer.connect', () => {
  console.log('Kafka producer connected');
});
const sendUserEvent = async (event, data) => {
  await producer.connect();
  await producer.send({
    topic: "user-events",
    messages: [{ key: event, value: JSON.stringify(data) }],
  });
  await producer.disconnect();
};

module.exports= { sendUserEvent };
