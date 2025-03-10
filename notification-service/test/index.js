const { Kafka } =require("kafkajs");

const kafka = new Kafka({
  clientId: "idea-service",
  brokers: ["localhost:9092"],
});
const producer = kafka.producer();

const sendIdeaUpdate = async () => {
  await producer.connect();
  await producer.send({
    topic: "idea-updates",
    messages: [
      {
        value: JSON.stringify({
          userId: "123",
          ideaId: "457",
          messageText: "Idea updated!",
        }),
      },
    ],
  });
  await producer.disconnect();
};

sendIdeaUpdate().catch(console.error);
