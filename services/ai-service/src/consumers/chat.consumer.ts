import {
  channel,
  CHAT_TITLE_QUEUE,
  CHAT_TITLE_RETRY_QUEUE,
  CHAT_RETRY_EXCHANGE,
  CHAT_TITLE_RETRY_ROUTING_KEY,
  CHAT_DLX_EXCHANGE,
  CHAT_TITLE_FAILED_ROUTING_KEY,
  CONVERSATION_UPDATED_QUEUE,
} from "../config/rabbit";

import OpenAI from "openai";
import Conversation from "../models/conversation.model";
import cacheService from "../services/cache.service";

const MAX_RETRIES = 3;

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

/*
|--------------------------------------------------------------------------
| Read retry count from RabbitMQ x-death header
|--------------------------------------------------------------------------
*/

const getRetryCount = (
  headers: Record<string, unknown> | undefined
): number => {
  const xDeath = headers?.["x-death"];

  if (!Array.isArray(xDeath)) {
    return 0;
  }

  /*
   * x-death can contain entries for multiple queues.
   * We only need the entry created when the message expired
   * from our retry queue.
   */
  const retryQueueDeath = xDeath.find((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const death = entry as {
      queue?: string;
      reason?: string;
      count?: number;
    };

    return (
      death.queue === CHAT_TITLE_RETRY_QUEUE &&
      death.reason === "expired"
    );
  }) as
    | {
      count?: number;
    }
    | undefined;

  return Number(retryQueueDeath?.count ?? 0);
};

/*
|--------------------------------------------------------------------------
| Identify errors that should not be retried
|--------------------------------------------------------------------------
*/

const isPermanentError = (error: unknown): boolean => {
  /*
   * Invalid JSON is a permanent message problem.
   * Trying the same malformed message again will not fix it.
   */
  if (error instanceof SyntaxError) {
    return true;
  }

  /*
   * OpenAI/OpenRouter 4xx errors such as invalid request
   * or invalid authentication generally should not be retried.
   *
   * 408 and 429 are temporary, so they are retryable.
   */
  if (error instanceof OpenAI.APIError) {
    const status = error.status;

    if (
      status &&
      status >= 400 &&
      status < 500 &&
      status !== 408 &&
      status !== 429
    ) {
      return true;
    }
  }

  return false;
};

/*
|--------------------------------------------------------------------------
| Publish message and wait for RabbitMQ confirmation
|--------------------------------------------------------------------------
*/

const publishAndConfirm = async (
  exchange: string,
  routingKey: string,
  content: Buffer,
  headers: Record<string, unknown> | undefined,
  additionalHeaders: Record<string, unknown> = {}
): Promise<void> => {
  channel.publish(exchange, routingKey, content, {
    persistent: true,

    /*
     * Existing headers preserve x-death.
     *
     * This is critical. If we do not preserve x-death while
     * publishing to the retry queue, retry count can reset.
     */
    headers: {
      ...(headers ?? {}),
      ...additionalHeaders,
    },
  });

  /*
   * Wait until RabbitMQ confirms the publication.
   * Only then should the original message be acknowledged.
   */
  await channel.waitForConfirms();
};

/*
|--------------------------------------------------------------------------
| Send temporary failure to delayed retry queue
|--------------------------------------------------------------------------
*/

const sendToRetryQueue = async (
  msg: NonNullable<
    Parameters<Parameters<typeof channel.consume>[1]>[0]
  >,
  retryCount: number,
  error: unknown
): Promise<void> => {
  const errorMessage =
    error instanceof Error
      ? error.message
      : "Unknown consumer error";

  await publishAndConfirm(
    CHAT_RETRY_EXCHANGE,
    CHAT_TITLE_RETRY_ROUTING_KEY,
    msg.content,
    msg.properties.headers,
    {
      "x-last-error": errorMessage,
      "x-last-failed-at": new Date().toISOString(),
    }
  );

  console.warn("Chat title message sent for retry", {
    retryAttempt: retryCount + 1,
    maxRetries: MAX_RETRIES,
    error: errorMessage,
  });
};

/*
|--------------------------------------------------------------------------
| Send permanent/exhausted message to final DLQ
|--------------------------------------------------------------------------
*/

const sendToDLQ = async (
  msg: NonNullable<
    Parameters<Parameters<typeof channel.consume>[1]>[0]
  >,
  retryCount: number,
  error: unknown
): Promise<void> => {
  const errorMessage =
    error instanceof Error
      ? error.message
      : "Unknown consumer error";

  await publishAndConfirm(
    CHAT_DLX_EXCHANGE,
    CHAT_TITLE_FAILED_ROUTING_KEY,
    msg.content,
    msg.properties.headers,
    {
      "x-final-error": errorMessage,
      "x-final-failed-at": new Date().toISOString(),
      "x-final-retry-count": retryCount,
    }
  );

  console.error("Chat title message sent to DLQ", {
    retryCount,
    error: errorMessage,
  });
};

export const startChatConsumer =
  async (): Promise<void> => {
    /*
     * Deliver only one unacknowledged message at a time
     * to this consumer.
     */
    await channel.prefetch(1);

    await channel.consume(
      CHAT_TITLE_QUEUE,
      async (msg) => {
        if (!msg) {
          return;
        }

        const retryCount = getRetryCount(
          msg.properties.headers
        );

        try {
          const parsedMessage = JSON.parse(
            msg.content.toString()
          );

          const { conversationId, message } =
            parsedMessage;

          /*
           * Missing required fields represent an invalid message.
           * Retrying it will not repair the payload.
           */
          if (
            typeof conversationId !== "string" ||
            typeof message !== "string" ||
            !conversationId ||
            !message
          ) {
            throw new SyntaxError(
              "Invalid chat-title message payload"
            );
          }

          const conversation =
            await Conversation.findById(
              conversationId
            );

          /*
           * Conversation was deleted or ID is permanently invalid.
           * There is no useful work left to perform.
           */
          if (!conversation) {
            throw new SyntaxError(
              `Conversation not found: ${conversationId}`
            );
          }

          /*
           * Idempotency protection:
           *
           * The message may be delivered more than once.
           * If title is already generated, do not call LLM again.
           */
          if (conversation.title !== "New Chat") {
            await cacheService.del(
              `conversations:${conversation.userId}`
            );

            channel.sendToQueue(
              CONVERSATION_UPDATED_QUEUE,
              Buffer.from(
                JSON.stringify({
                  conversationId,
                  title: conversation.title,
                  userId: conversation.userId,
                })
              ),
              {
                persistent: true,
              }
            );

            await channel.waitForConfirms();

            console.log(
              "Chat title already processed; duplicate skipped",
              {
                conversationId,
                title: conversation.title,
              }
            );

            channel.ack(msg);
            return;
          }

          /*
 * Temporary test failure
 */
          if (process.env.FORCE_CHAT_TITLE_FAILURE === "true") {
            throw new Error(
              "Forced temporary failure for RabbitMQ retry testing"
            );
          }

          const completion =
            await client.chat.completions.create({
              model: "openrouter/free",
              messages: [
                {
                  role: "system",
                  content:
                    "Generate a very short chat title (max 5 words). Return only the title.",
                },
                {
                  role: "user",
                  content: message,
                },
              ],
            });

          const title =
            completion.choices[0]?.message?.content?.trim();

          if (!title) {
            throw new Error(
              "OpenRouter returned an empty title"
            );
          }

          /*
           * Conditional update protects against two consumers
           * updating the same New Chat simultaneously.
           */
          const updatedConversation =
            await Conversation.findOneAndUpdate(
              {
                _id: conversationId,
                title: "New Chat",
              },
              {
                $set: {
                  title,
                },
              },
              {
                new: true,
              }
            );

          /*
           * If update returns null, another delivery/consumer
           * may have already changed the title.
           */
          if (!updatedConversation) {
            const existingConversation =
              await Conversation.findById(
                conversationId
              );

            if (!existingConversation) {
              throw new SyntaxError(
                `Conversation not found after title generation: ${conversationId}`
              );
            }

            await cacheService.del(
              `conversations:${existingConversation.userId}`
            );

            channel.ack(msg);
            return;
          }

          await cacheService.del(
            `conversations:${updatedConversation.userId}`
          );

          channel.sendToQueue(
            CONVERSATION_UPDATED_QUEUE,
            Buffer.from(
              JSON.stringify({
                conversationId,
                title:
                  updatedConversation.title,
                userId:
                  updatedConversation.userId,
              })
            ),
            {
              persistent: true,
            }
          );

          await channel.waitForConfirms();

          /*
           * ACK only after all required work succeeds.
           */
          channel.ack(msg);

          console.log(
            "Chat title generated successfully",
            {
              conversationId,
              title:
                updatedConversation.title,
              retryCount,
            }
          );
        } catch (error) {
          const permanentError =
            isPermanentError(error);

          console.error(
            "Chat title processing failed",
            {
              retryCount,
              permanentError,
              error:
                error instanceof Error
                  ? error.message
                  : error,
            }
          );

          try {
            /*
             * Permanent errors should go directly to DLQ.
             */
            if (permanentError) {
              await sendToDLQ(
                msg,
                retryCount,
                error
              );

              channel.ack(msg);
              return;
            }

            /*
             * Initial attempt:
             * retryCount = 0
             *
             * Returned from retry queue:
             * retryCount = 1, 2, 3
             */
            if (retryCount < MAX_RETRIES) {
              await sendToRetryQueue(
                msg,
                retryCount,
                error
              );

              /*
               * Retry copy is confirmed by RabbitMQ.
               * The original delivery can now be removed.
               */
              channel.ack(msg);
              return;
            }

            /*
             * Three retries have already happened.
             * Store the failed message in final DLQ.
             */
            await sendToDLQ(
              msg,
              retryCount,
              error
            );

            channel.ack(msg);
          } catch (publishError) {
            /*
             * Retry/DLQ publishing itself failed.
             *
             * Do not ACK the original message because doing so
             * could permanently lose the work.
             *
             * requeue=true sends original delivery back to main
             * queue. This is reserved for broker-publication
             * failure, not normal business retry.
             */
            console.error(
              "Could not publish message to retry queue or DLQ",
              {
                error:
                  publishError instanceof Error
                    ? publishError.message
                    : publishError,
              }
            );

            channel.nack(msg, false, true);
          }
        }
      },
      {
        noAck: false,
      }
    );

    console.log("Chat title consumer started");
  };