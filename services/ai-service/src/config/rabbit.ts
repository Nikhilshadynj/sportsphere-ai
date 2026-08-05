import amqp from "amqplib";

let channel: amqp.ConfirmChannel;

const RABBITMQ_URL =
  process.env.RABBITMQ_URL ??
  "amqp://guest:guest@localhost:5672";

/*
|--------------------------------------------------------------------------
| Exchange names
|--------------------------------------------------------------------------
*/

export const CHAT_EXCHANGE = "chat";
export const CHAT_RETRY_EXCHANGE = "chat-retry";
export const CHAT_DLX_EXCHANGE = "chat-dlx";

/*
|--------------------------------------------------------------------------
| Queue names
|--------------------------------------------------------------------------
*/

export const CHAT_TITLE_QUEUE = "chat-title";
export const CHAT_TITLE_RETRY_QUEUE = "chat-title-retry";
export const CHAT_TITLE_DLQ = "chat-title-dlq";
export const CONVERSATION_UPDATED_QUEUE = "conversation.updated";

/*
|--------------------------------------------------------------------------
| Routing keys
|--------------------------------------------------------------------------
*/

export const CHAT_CREATED_ROUTING_KEY = "chat.created";
export const CHAT_TITLE_RETRY_ROUTING_KEY =
  "chat.title.retry";
export const CHAT_TITLE_FAILED_ROUTING_KEY =
  "chat.title.failed";

/*
|--------------------------------------------------------------------------
| Retry configuration
|--------------------------------------------------------------------------
*/

export const CHAT_TITLE_RETRY_DELAY_MS = 10_000;

export const connectRabbit = async (): Promise<void> => {
  const connection = await amqp.connect(
    RABBITMQ_URL
  );

  channel = await connection.createConfirmChannel();
  /*
  |--------------------------------------------------------------------------
  | 1. Main exchange
  |--------------------------------------------------------------------------
  |
  | Controller publishes chat.created events here.
  |
  */

  await channel.assertExchange(
    CHAT_EXCHANGE,
    "direct",
    {
      durable: true,
    }
  );

  /*
  |--------------------------------------------------------------------------
  | 2. Retry exchange
  |--------------------------------------------------------------------------
  |
  | Failed messages are published here before entering retry queue.
  |
  */

  await channel.assertExchange(
    CHAT_RETRY_EXCHANGE,
    "direct",
    {
      durable: true,
    }
  );

  /*
  |--------------------------------------------------------------------------
  | 3. Final dead-letter exchange
  |--------------------------------------------------------------------------
  |
  | Messages are sent here after all retries are exhausted.
  |
  */

  await channel.assertExchange(
    CHAT_DLX_EXCHANGE,
    "direct",
    {
      durable: true,
    }
  );

  /*
  |--------------------------------------------------------------------------
  | 4. Main title-generation queue
  |--------------------------------------------------------------------------
  */

  await channel.assertQueue(CHAT_TITLE_QUEUE, {
    durable: true,
  });

  await channel.bindQueue(
    CHAT_TITLE_QUEUE,
    CHAT_EXCHANGE,
    CHAT_CREATED_ROUTING_KEY
  );

  /*
  |--------------------------------------------------------------------------
  | 5. Delayed retry queue
  |--------------------------------------------------------------------------
  |
  | Message remains here for 10 seconds.
  |
  | After TTL expiry, RabbitMQ dead-letters it back to:
  | exchange    = chat
  | routing key = chat.created
  |
  | This sends the message back to chat-title queue.
  |
  */

  await channel.assertQueue(
    CHAT_TITLE_RETRY_QUEUE,
    {
      durable: true,
      messageTtl: CHAT_TITLE_RETRY_DELAY_MS,
      deadLetterExchange: CHAT_EXCHANGE,
      deadLetterRoutingKey:
        CHAT_CREATED_ROUTING_KEY,
    }
  );

  await channel.bindQueue(
    CHAT_TITLE_RETRY_QUEUE,
    CHAT_RETRY_EXCHANGE,
    CHAT_TITLE_RETRY_ROUTING_KEY
  );

  /*
  |--------------------------------------------------------------------------
  | 6. Final Dead Letter Queue
  |--------------------------------------------------------------------------
  |
  | Messages that cannot be processed after maximum retries
  | are stored here for investigation and possible replay.
  |
  */

  await channel.assertQueue(CHAT_TITLE_DLQ, {
    durable: true,
  });

  await channel.bindQueue(
    CHAT_TITLE_DLQ,
    CHAT_DLX_EXCHANGE,
    CHAT_TITLE_FAILED_ROUTING_KEY
  );

  /*
  |--------------------------------------------------------------------------
  | 7. Existing conversation-updated queue
  |--------------------------------------------------------------------------
  */

  await channel.assertQueue(
    CONVERSATION_UPDATED_QUEUE,
    {
      durable: true,
    }
  );

  console.log("RabbitMQ connected");
  console.log(
    "RabbitMQ retry and DLQ topology configured"
  );
};

export { channel };