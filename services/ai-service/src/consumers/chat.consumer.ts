import { channel } from "../config/rabbit";
import OpenAI from "openai";
import Conversation from "../models/conversation.model";
import cacheService from "../services/cache.service";
import { getIO } from "../config/socket";

const io = getIO();

const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

export const startChatConsumer = async () => {
    channel.consume("chat-title", async (msg) => {
        if (!msg) return;

        try {
            const { conversationId, message } = JSON.parse(
                msg.content.toString()
            );

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
            const conversation =
                await Conversation.findById(conversationId);
            const title =
                completion.choices[0]?.message?.content?.trim();

            if (title) {
                await Conversation.findByIdAndUpdate(
                    conversationId,
                    {
                        title,
                    }
                );

                await cacheService.del(
                    `conversations:${conversation?.userId}`
                );

                channel.sendToQueue(
                    "conversation.updated",
                    Buffer.from(
                        JSON.stringify({
                            conversationId,
                            title,
                            userId : conversation?.userId
                        })
                    ),
                    {
                        persistent: true,
                    }
                );

                console.log("📤 conversation.updated published");


                console.log("Title Updated:", title);
            }

            channel.ack(msg);
        } catch (error) {
            console.log(error);

            channel.nack(msg, false, false);
        }
    });
};