const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'user-group' });

const run = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'user-service', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`Received: ${message.value.toString()}`);
    },
  });
};

run().catch(console.error);
