import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbit = async () => {
  const connection = await amqp.connect(
    "amqp://guest:guest@localhost:5672"
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