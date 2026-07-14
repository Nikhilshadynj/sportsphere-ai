"use client";

import { useEffect, useState } from "react";

type Tool =
  | "chat"
  | "match"
  | "commentary"
  | "document"
  | "codebase";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  _id: string;
  title: string;
  updatedAt: string;
}

export default function Home() {
  const [activeTool, setActiveTool] = useState<Tool>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [matchForm, setMatchForm] = useState({
    teamA: "",
    teamB: "",
    format: "T20",
    venue: "",
    pitch: "",
    weather: "",
    keyPlayers: "",
  });
  const [matchResponse, setMatchResponse] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
  initializeConversation();
  loadConversations();
}, []);

 const createConversation = async () => {
  const res = await fetch(
    "http://localhost:4000/api/ai/conversation",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: "nikhil123",
        title: "New Chat",
      }),
    }
  );

  const data = await res.json();

  localStorage.setItem("conversationId", data._id);

  setConversationId(data._id);
  setMessages([]);

  await loadConversations();
};

const initializeConversation = async () => {
  const existingConversationId = localStorage.getItem("conversationId");

  if (existingConversationId) {
    setConversationId(existingConversationId);
    await loadMessages(existingConversationId);
    return;
  }

  await createConversation();
};

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return;

    const currentInput = input;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: currentInput,
      },
    ]);

    setInput("");
    setLoading(true);

    const res = await fetch("http://localhost:4000/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId,
        message: currentInput,
      }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: data.response,
      },
    ]);

    setLoading(false);
  };

  const analyzeMatch = async () => {
    setMatchLoading(true);
    setMatchResponse("");
  
    try {
      const res = await fetch("http://localhost:4000/api/ai/match/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...matchForm,
          keyPlayers: matchForm.keyPlayers
            .split(",")
            .map((player) => player.trim())
            .filter(Boolean),
        }),
      });
  
      const data = await res.json();
      setMatchResponse(data.response || "No response");
    } catch (error) {
      setMatchResponse("Something went wrong");
    } finally {
      setMatchLoading(false);
    }
  };

  const menuItems: { id: Tool; label: string }[] = [
    { id: "chat", label: "AI Chat" },
    { id: "match", label: "Match Analysis" },
    { id: "commentary", label: "Commentary Summarizer" },
    { id: "document", label: "Document RAG" },
    { id: "codebase", label: "Codebase RAG" },
  ];

  const loadMessages = async (id: string) => {
  const res = await fetch(
    `http://localhost:4000/api/ai/conversation/${id}/messages`
  );

  const data = await res.json();

  setMessages(data);
};

const loadConversations = async () => {
  const res = await fetch("http://localhost:4000/api/ai/list");

  const data = await res.json();

  setConversations(data.conversations);
};

  return (
    <main className="min-h-screen bg-black text-white flex">
      <aside className="w-72 border-r border-zinc-800 p-5">
        <h1 className="text-2xl font-bold mb-8">Sportsphere AI</h1>
<button onClick={createConversation}>
  + New Chat
</button>

<h3 className="text-sm text-zinc-400 mb-2">
  Conversations
</h3>

<div className="space-y-2 mb-6 max-h-72 overflow-y-auto">
  {conversations.map((conversation) => (
    <button
      key={conversation._id}
      onClick={() => {
        localStorage.setItem(
          "conversationId",
          conversation._id
        );

        setConversationId(conversation._id);

        loadMessages(conversation._id);

        setActiveTool("chat");
      }}
      className={`w-full text-left rounded-xl px-3 py-2 text-sm truncate ${
  conversationId === conversation._id
    ? "bg-blue-600"
    : "bg-zinc-900 hover:bg-zinc-800"
}`}
    >
      {conversation.title}
    </button>
  ))}
</div>
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTool(item.id)}
              className={`w-full text-left px-4 py-3 rounded-xl ${
                activeTool === item.id
                  ? "bg-blue-600"
                  : "bg-zinc-900 hover:bg-zinc-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 p-8">
        {activeTool === "chat" && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-6">AI Chat</h2>

            <div className="space-y-4 mb-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-2xl max-w-[80%] ${
                    message.role === "user"
                      ? "bg-blue-600 ml-auto"
                      : "bg-zinc-800"
                  }`}
                >
                  <p className="text-xs text-zinc-300 mb-1">
                    {message.role}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              ))}

              {loading && (
                <div className="bg-zinc-800 p-4 rounded-2xl w-fit">
                  Thinking...
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask something..."
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
              />

              <button
                onClick={sendMessage}
                disabled={loading}
                className="bg-blue-600 px-6 rounded-xl disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        )}

{activeTool === "match" && (
  <div className="max-w-4xl mx-auto">
    <h2 className="text-3xl font-bold mb-6">Match Analysis</h2>

    <div className="grid grid-cols-2 gap-4">
      {["teamA", "teamB", "format", "venue", "pitch", "weather"].map((field) => (
        <input
          key={field}
          value={matchForm[field as keyof typeof matchForm]}
          onChange={(e) =>
            setMatchForm((prev) => ({
              ...prev,
              [field]: e.target.value,
            }))
          }
          placeholder={field}
          className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 outline-none"
        />
      ))}
    </div>

    <textarea
      value={matchForm.keyPlayers}
      onChange={(e) =>
        setMatchForm((prev) => ({
          ...prev,
          keyPlayers: e.target.value,
        }))
      }
      placeholder="Key players comma separated: Virat Kohli, Bumrah, Maxwell"
      className="w-full mt-4 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 outline-none h-28"
    />

    <button
      onClick={analyzeMatch}
      disabled={matchLoading}
      className="mt-4 bg-blue-600 px-6 py-3 rounded-xl disabled:opacity-50"
    >
      {matchLoading ? "Analyzing..." : "Analyze Match"}
    </button>

    {matchResponse && (
      <div className="mt-6 bg-zinc-900 border border-zinc-700 rounded-xl p-5 whitespace-pre-wrap">
        {matchResponse}
      </div>
    )}
  </div>
)}

{activeTool !== "chat" && activeTool !== "match" && (
  <div className="max-w-4xl mx-auto">
    <h2 className="text-3xl font-bold mb-3">
      {menuItems.find((item) => item.id === activeTool)?.label}
    </h2>
    <p className="text-zinc-400">
      Is feature ka UI next step me connect karenge.
    </p>
  </div>
)}
      </section>
    </main>
  );
}