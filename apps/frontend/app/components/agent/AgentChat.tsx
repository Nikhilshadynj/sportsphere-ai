"use client";

import { useState } from "react";

import { useChat } from "@/context/chat-context";
import { API_BASE_URL } from "@/app/lib/config";

import { sendAgentMessage } from "../../services/agent.service";

function createMessageId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function getToolLabel(
  toolName: string
): string {
  switch (toolName) {
    case "get_live_matches":
      return "Live Match Data";

    case "search_document":
      return "Document Search";

    default:
      return toolName;
  }
}

interface CreateConversationResponse {
  _id: string;
  title?: string;
  type?: "chat" | "agent";
  message?: string;
}

export default function AgentChat() {
  const {
    conversationId,
    setConversationId,
    messages,
    setMessages,
    loadConversations,
    messagesLoading,
  } = useChat();

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const createAgentConversation =
    async (): Promise<string> => {
      const token =
        localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please log in again."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/ai/conversation`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: "New Agent Chat",
            type: "agent",
          }),
        }
      );

      const result =
        (await response.json()) as CreateConversationResponse;

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Agent conversation creation failed"
        );
      }

      if (!result._id) {
        throw new Error(
          "Conversation ID was not returned"
        );
      }

      setConversationId(result._id);
      setMessages([]);

      await loadConversations();

      return result._id;
    };

  const sendMessage =
    async (): Promise<void> => {
      const message = input.trim();

      if (!message || loading) {
        return;
      }

      const token =
        localStorage.getItem("token");

      if (!token) {
        setError(
          "Your session has expired. Please log in again."
        );
        return;
      }

      setInput("");
      setError("");
      setLoading(true);

      const userMessageClientId =
        createMessageId();

      setMessages(
        (previousMessages) => [
          ...previousMessages,
          {
            clientId:
              userMessageClientId,
            role: "user",
            content: message,
          },
        ]
      );

      try {
        let activeConversationId =
          conversationId;

        if (!activeConversationId) {
          activeConversationId =
            await createAgentConversation();
        }

        const result =
          await sendAgentMessage({
            message,
            conversationId:
              activeConversationId,
            token,
          });

        setMessages(
          (previousMessages) => [
            ...previousMessages,
            {
              clientId:
                createMessageId(),
              role: "assistant",
              content:
                result.response,
              toolsUsed:
                result.toolsUsed ?? [],
            },
          ]
        );

        await loadConversations();
      } catch (requestError) {
        /*
         * Request fail hone par optimistic
         * user message remove kar rahe hain,
         * kyunki backend mein save hua ya nahi,
         * ye guaranteed nahi hai.
         */
        setMessages(
          (previousMessages) =>
            previousMessages.filter(
              (savedMessage) =>
                savedMessage.clientId !==
                userMessageClientId
            )
        );

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Agent request failed"
        );
      } finally {
        setLoading(false);
      }
    };

  const startNewAgentChat =
    (): void => {
      setConversationId("");
      setMessages([]);
      setInput("");
      setError("");
    };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">
            Sportsphere Agent
          </h2>

          <p className="mt-2 text-sm text-zinc-400">
            Ask about live cricket matches
            or information from your
            uploaded documents.
          </p>
        </div>

        <button
          type="button"
          onClick={startNewAgentChat}
          disabled={loading}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm transition hover:bg-zinc-900 disabled:opacity-50"
        >
          New Agent Chat
        </button>
      </div>

      <div className="mb-6 flex-1 space-y-4">
        {messagesLoading && (
          <div className="text-sm text-zinc-400">
            Loading messages...
          </div>
        )}

        {!messagesLoading &&
          messages.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <p className="font-medium">
                Try asking:
              </p>

              <div className="mt-3 space-y-2 text-sm text-zinc-400">
                <p>
                  “Show me up to three
                  current live cricket
                  matches.”
                </p>

                <p>
                  “According to my uploaded
                  report, who was Player of
                  the Match?”
                </p>
              </div>
            </div>
          )}

        {messages.map(
          (chatMessage, index) => {
            const messageKey =
              chatMessage._id ??
              chatMessage.clientId ??
              `${chatMessage.role}-${index}`;

            return (
              <div
                key={messageKey}
                className={`max-w-[85%] rounded-2xl p-4 ${
                  chatMessage.role ===
                  "user"
                    ? "ml-auto bg-blue-600"
                    : "bg-zinc-800"
                }`}
              >
                <p className="mb-2 text-xs capitalize text-zinc-300">
                  {chatMessage.role}
                </p>

                <p className="whitespace-pre-wrap">
                  {chatMessage.content}
                </p>

                {chatMessage.role ===
                  "assistant" &&
                  chatMessage.toolsUsed &&
                  chatMessage.toolsUsed
                    .length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {chatMessage.toolsUsed.map(
                        (toolName) => (
                          <span
                            key={toolName}
                            className="rounded-full bg-zinc-700 px-3 py-1 text-xs text-zinc-200"
                          >
                            Used:{" "}
                            {getToolLabel(
                              toolName
                            )}
                          </span>
                        )
                      )}
                    </div>
                  )}
              </div>
            );
          }
        )}

        {loading && (
          <div className="w-fit rounded-2xl bg-zinc-800 p-4 text-zinc-300">
            Agent is thinking...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 flex gap-3 bg-black py-4">
        <input
          value={input}
          onChange={(event) =>
            setInput(event.target.value)
          }
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          disabled={loading}
          placeholder="Ask the Sportsphere Agent..."
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none disabled:opacity-60"
        />

        <button
          type="button"
          onClick={() =>
            void sendMessage()
          }
          disabled={
            loading || !input.trim()
          }
          className="rounded-xl bg-blue-600 px-6 font-medium transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}