const { Kafka,Partitioners } = require('kafkajs');


const kafka = new Kafka({
  clientId: 'my-app',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

const run = async () => {
  await producer.connect();
  await producer.send({
    topic: 'user-service',
    messages: [{ value: 'Helloooo Sreekutty !!!' }],
  });
  await producer.disconnect();
};

run().catch(console.error);
