import {
    Request,
    Response,
} from "express";

import type OpenAI from "openai";

import {
    runAgent,
} from "../agent/agent.service";

import Conversation from "../models/conversation.model";
import Message from "../models/message.model";
import cacheService from "../services/cache.service";

import { channel } from "../config/rabbit";

export const chatWithAgent = async (
    req: Request,
    res: Response
): Promise<Response> => {
    try {
        const {
            message,
            conversationId,
        } = req.body as {
            message?: string;
            conversationId?: string;
        };

        const userId =
            req.headers[
            "x-user-id"
            ] as string;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "A non-empty message is required",
            });
        }

        if (!conversationId) {
            return res.status(400).json({
                success: false,
                message:
                    "conversationId is required",
            });
        }

        /*
         * Verify:
         * 1. Conversation exists
         * 2. Logged-in user owns it
         * 3. It is an agent conversation
         */
        const conversation =
            await Conversation.findOne({
                _id: conversationId,
                userId,
                type: "agent",
            });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message:
                    "Agent conversation not found",
            });
        }

        const trimmedMessage =
            message.trim();

        /*
         * Save current user message.
         */
        await Message.create({
            conversationId,
            role: "user",
            content: trimmedMessage,
        });

        if (
            conversation.title === "New Agent Chat" ||
            conversation.title === "New Chat"
        ) {
            channel.publish(
                "chat",
                "chat.created",
                Buffer.from(
                    JSON.stringify({
                        conversationId,
                        message: trimmedMessage,
                    })
                ),
                {
                    persistent: true,
                }
            );

            console.log(
                "📤 Agent chat.created published"
            );
        }
        /*
         * Fetch full conversation history,
         * including the message just saved.
         */
        const storedMessages =
            await Message.find({
                conversationId,
            }).sort({
                createdAt: 1,
            });

        const conversationHistory:
            OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
            storedMessages.map(
                (storedMessage) => ({
                    role:
                        storedMessage.role as
                        | "user"
                        | "assistant",

                    content:
                        storedMessage.content,
                })
            );

        /*
         * runAgent already receives the current
         * message separately, so remove the latest
         * user message from history to prevent
         * sending it twice.
         */
        conversationHistory.pop();

        const result =
            await runAgent({
                message: trimmedMessage,
                userId,
                conversationHistory,
            });

        /*
         * Save final assistant answer.
         *
         * We store the user-facing answer only.
         * Internal tool-call messages are not stored
         * in the current Message schema.
         */
        const assistantMessage =
            await Message.create({
                conversationId,
                role: "assistant",
                content: result.response,
            });

        await Conversation.findByIdAndUpdate(
            conversationId,
            {
                updatedAt: new Date(),
            }
        );

        /*
         * Stored conversation/message data changed,
         * so invalidate related Redis entries.
         */
        await cacheService.del(
            `messages:${conversationId}`
        );

        await cacheService.del(
            `conversations:${userId}`
        );

        return res.status(200).json({
            success: true,
            conversationId,
            response:
                result.response,
            toolsUsed:
                result.toolsUsed,
            message:
                assistantMessage,
        });
    } catch (error) {
        console.error(
            "Agent request failed:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Agent request failed",
        });
    }
};