"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

export interface Conversation {
  _id: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  _id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface ChatContextValue {
  activeTool: string;
  setActiveTool: (tool: string) => void;

  conversations: Conversation[];
  setConversations: React.Dispatch<
    React.SetStateAction<Conversation[]>
  >;

  conversationId: string;
  setConversationId: (id: string) => void;

  messages: ChatMessage[];
  setMessages: React.Dispatch<
    React.SetStateAction<ChatMessage[]>
  >;

  conversationsLoading: boolean;
  messagesLoading: boolean;

  loadConversations: () => Promise<void>;
  loadMessages: (id: string) => Promise<void>;
  createConversation: () => Promise<void>;
}

const ChatContext =
  createContext<ChatContextValue | null>(null);

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
  "http://localhost:4000/api";

function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("token");
}

function getAuthHeaders(): HeadersInit {
  const token = getToken();

  return token
    ? {
      Authorization: `Bearer ${token}`,
    }
    : {};
}

function extractConversations(
  response: unknown
): Conversation[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    typeof response === "object" &&
    response !== null
  ) {
    const result = response as {
      data?: unknown;
      conversations?: unknown;
    };

    if (Array.isArray(result.data)) {
      return result.data;
    }

    if (Array.isArray(result.conversations)) {
      return result.conversations;
    }

    if (
      typeof result.data === "object" &&
      result.data !== null &&
      "conversations" in result.data
    ) {
      const nestedData = result.data as {
        conversations?: unknown;
      };

      if (
        Array.isArray(
          nestedData.conversations
        )
      ) {
        return nestedData.conversations;
      }
    }
  }

  return [];
}

function extractMessages(
  response: unknown
): ChatMessage[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    typeof response === "object" &&
    response !== null
  ) {
    const result = response as {
      data?: unknown;
      messages?: unknown;
    };

    if (Array.isArray(result.data)) {
      return result.data;
    }

    if (Array.isArray(result.messages)) {
      return result.messages;
    }

    if (
      typeof result.data === "object" &&
      result.data !== null &&
      "messages" in result.data
    ) {
      const nestedData = result.data as {
        messages?: unknown;
      };

      if (Array.isArray(nestedData.messages)) {
        return nestedData.messages;
      }
    }
  }

  return [];
}

export function ChatProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const [activeTool, setActiveTool] =
    useState("match");

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [
    conversationId,
    setConversationIdState,
  ] = useState("");

  const [messages, setMessages] = useState<
    ChatMessage[]
  >([]);

  const [
    conversationsLoading,
    setConversationsLoading,
  ] = useState(true);

  const [
    messagesLoading,
    setMessagesLoading,
  ] = useState(false);

  const setConversationId = useCallback(
    (id: string): void => {
      setConversationIdState(id);
    },
    []
  );

  const loadConversations =
    useCallback(async (): Promise<void> => {
      const token = getToken();

      if (!token) {
        setConversations([]);
        setConversationsLoading(false);
        return;
      }
      try {
        setConversationsLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/ai/list`,
          {
            method: "GET",
            headers: {
              ...getAuthHeaders(),
            },
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ||
            "Failed to load conversations"
          );
        }

        const conversationList =
          extractConversations(result);

        setConversations(
          conversationList
        );
      } catch (error) {
        console.error(
          "Load conversations failed:",
          error
        );

        setConversations([]);
      } finally {
        setConversationsLoading(false);
      }
    }, []);

  const loadMessages = useCallback(
    async (id: string): Promise<void> => {
      try {
        setMessagesLoading(true);

        /*
         * Conversation click hote hi selected state
         * update kar do, taaki sidebar highlight ho.
         */
        setConversationId(id);

        const response = await fetch(
          `${API_BASE_URL}/ai/conversation/${id}/messages`,
          {
            method: "GET",
            headers: {
              ...getAuthHeaders(),
            },
            cache: "no-store",
          }
        );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result?.message ||
            "Failed to load messages"
          );
        }

        const messageList =
          extractMessages(result);

        setMessages(messageList);

        /*
         * Matches ya kisi aur page se conversation
         * click ho to chat page open karo.
         *
         * Already "/" par ho to bhi state update ki
         * wajah se chat page rerender hoga.
         */
        router.push("/");
      } catch (error) {
        console.error(
          "Load messages failed:",
          error
        );
      } finally {
        setMessagesLoading(false);
      }
    },
    [router, setConversationId]
  );

  const createConversation =
    useCallback(async (): Promise<void> => {
      setConversationId("");
      setMessages([]);
      setActiveTool("match");

      router.push("/");
    }, [router, setConversationId]);

  useEffect(() => {
    setConversationIdState("");
    setMessages([]);

    localStorage.removeItem("conversationId");

    void loadConversations();
  }, [loadConversations]);

  return (
    <ChatContext.Provider
      value={{
        activeTool,
        setActiveTool,

        conversations,
        setConversations,

        conversationId,
        setConversationId,

        messages,
        setMessages,

        conversationsLoading,
        messagesLoading,

        loadConversations,
        loadMessages,
        createConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error(
      "useChat must be used inside ChatProvider"
    );
  }

  return context;
}