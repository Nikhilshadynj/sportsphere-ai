"use client";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import { useChat } from "@/context/chat-context";

const menuItems = [
  {
    id: "match",
    label: "Match Analysis",
  },
  {
    id: "agent",
    label: "AI Sports Agent",
  },
  {
    id: "commentary",
    label: "Commentary Summarizer",
  },
  {
    id: "document",
    label: "Document RAG",
  },
  {
    id: "codebase",
    label: "Codebase RAG",
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const {
    activeTool,
    setActiveTool,

    conversations,
    conversationId,

    conversationsLoading,

    loadMessages,
    createConversation,
  } = useChat();

  const isMatchesPage =
    pathname.startsWith("/matches");

  const handleToolClick = (
    toolId: string
  ): void => {
    /*
     * Tool state context mein update hogi.
     */
    setActiveTool(toolId);

    /*
     * Matches page se tool click hone par
     * home/chat page open hoga.
     */
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const handleConversationClick = async (
    id: string
  ): Promise<void> => {
    await loadMessages(id);
  };

  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-5 text-white">
      <button
        type="button"
        onClick={() => router.push("/")}
        className="mb-8 text-left text-2xl font-bold"
      >
        Sportsphere AI
      </button>

      <button
        type="button"
        onClick={() => {
          void createConversation();
        }}
        className="mb-6 w-full rounded-xl bg-blue-600 py-3 font-medium transition hover:bg-blue-700"
      >
        + New Chat
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Conversations
        </h3>

        <div className="space-y-2">
          {conversationsLoading ? (
            <p className="px-3 py-2 text-sm text-zinc-500">
              Loading conversations...
            </p>
          ) : conversations.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500">
              No conversations yet
            </p>
          ) : (
            conversations.map(
              (conversation) => {
                const isActive =
                  conversationId ===
                    conversation._id &&
                  !isMatchesPage;

                return (
                  <button
                    type="button"
                    key={conversation._id}
                    onClick={() => {
                      void handleConversationClick(
                        conversation._id
                      );
                    }}
                    title={
                      conversation.title
                    }
                    className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "bg-zinc-700"
                        : "hover:bg-zinc-800"
                    }`}
                  >
                    {conversation.title ||
                      "New Conversation"}
                  </button>
                );
              }
            )
          )}
        </div>

        <h3 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Tools
        </h3>

        <div className="space-y-2">
          {menuItems.map((item) => {
            const isActive =
              !isMatchesPage &&
              activeTool === item.id;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() =>
                  handleToolClick(item.id)
                }
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                  isActive
                    ? "bg-blue-600"
                    : "bg-zinc-900 hover:bg-zinc-800"
                }`}
              >
                {item.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() =>
              router.push("/matches")
            }
            className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
              isMatchesPage
                ? "bg-blue-600"
                : "bg-zinc-900 hover:bg-zinc-800"
            }`}
          >
            Matches
          </button>
        </div>
      </div>
    </aside>
  );
}