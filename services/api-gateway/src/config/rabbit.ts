import amqp from "amqplib";

let channel: amqp.Channel;

export const connectRabbit = async () => {
  const connection = await amqp.connect(
    "amqp://guest:guest@localhost:5672"
  );

  channel = await connection.createChannel();

  await channel.assertQueue(
    "conversation.updated",
    {
      durable: true,
    }
  );

  console.log("✅ RabbitMQ Connected");
  console.log("✅ conversation.updated queue ready");
};

export { channel };