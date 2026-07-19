"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { socket } from "./lib/socket";
import { useChat } from "@/context/chat-context";
import DocumentUpload from "./components/Document-rag/UploadDocument";
import DocumentChat from "./components/Document-rag/DocumentChat";

export default function Home() {
  const router = useRouter();

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    activeTool,

    conversationId,
    setConversationId,

    messages,
    setMessages,

    setConversations,
    messagesLoading,
    loadConversations
  } = useChat();

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    initialized.current = true;

    const token = localStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    socket.auth = { token };
    socket.connect();

    void loadConversations();

    return () => {
      socket.disconnect();
    };
  }, [router, loadConversations]);

  useEffect(() => {
    const handleConversationUpdated = async () => {
      await loadConversations();
    };

    socket.on(
      "conversationUpdated",
      handleConversationUpdated
    );

    return () => {
      socket.off(
        "conversationUpdated",
        handleConversationUpdated
      );
    };
  }, [loadConversations]);

  const createConversation = async () => {

    const res = await fetch(
      "http://localhost:4000/api/ai/conversation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          title: "New Chat",
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data.message ||
        "Conversation creation failed"
      );
    }

    setConversationId(data._id);
    setMessages([]);

    await loadConversations();

    return data._id;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    try {
      setLoading(true);

      let id = conversationId;

      if (!id) {
        id = await createConversation();
      }

      const currentInput = input.trim();

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "user",
          content: currentInput,
        },
      ]);

      setInput("");

      const res = await fetch(
        "http://localhost:4000/api/ai/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem(
              "token"
            )}`,
          },
          body: JSON.stringify({
            conversationId: id,
            message: currentInput,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Message failed"
        );
      }

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-full bg-black text-white">
      <section className="p-8">
        {activeTool === "match" && (
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-6 text-3xl font-bold">
              Match Analysis
            </h2>

            <div className="mb-6 space-y-4">
              {messagesLoading && (
                <div className="text-zinc-400">
                  Loading messages...
                </div>
              )}

              {!messagesLoading &&
                messages.length === 0 && (
                  <div className="py-20 text-center text-zinc-400">
                    Start a new conversation or select
                    one from the Sidebar.
                  </div>
                )}

              {messages.map((message, index) => (
                <div
                  key={message._id || index}
                  className={`max-w-[80%] rounded-2xl p-4 ${message.role === "user"
                    ? "ml-auto bg-blue-600"
                    : "bg-zinc-800"
                    }`}
                >
                  <p className="mb-1 text-xs text-zinc-300">
                    {message.role}
                  </p>

                  <p className="whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
              ))}

              {loading && (
                <div className="w-fit rounded-2xl bg-zinc-800 p-4">
                  Thinking...
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <input
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void sendMessage();
                  }
                }}
                placeholder="Ask something..."
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none"
              />

              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-6 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {activeTool === "document" && (
          <div className="mx-auto w-full max-w-4xl space-y-10 p-6">
            <DocumentUpload />

            <hr className="border-gray-200" />

            <DocumentChat />
          </div>
        )}
      </section>
    </main>
  );
}