import amqp from "amqplib";

let channel: amqp.Channel;

const RABBITMQ_URL =
  process.env.RABBITMQ_URL ??
  "amqp://guest:guest@localhost:5672";

export const connectRabbit = async () => {
  const connection = await amqp.connect(
    RABBITMQ_URL
  );

  channel = await connection.createChannel();
  await channel.assertExchange(
    "chat",
    "direct",
    {
      durable: true,
    }
  );

  await channel.assertQueue("chat-title", {
    durable: true,
  });

  await channel.bindQueue(
    "chat-title",
    "chat",
    "chat.created"
  );

  await channel.assertQueue(
  "conversation.updated",
  {
    durable: true,
  }
);
  
  console.log("RabbitMQ Connected");
    console.log("Exchange created");

};

export { channel };