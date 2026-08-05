import { apiRequest } from "../lib/api";
import type {
  AgentChatResponse,
} from "../types/agent";

interface SendAgentMessageInput {
  message: string;
   conversationId: string;
  token: string;
}

export async function sendAgentMessage({
  message,
  conversationId,
  token,
}: SendAgentMessageInput): Promise<AgentChatResponse> {
  return apiRequest<AgentChatResponse>(
    "/ai/agent/chat",
    {
      method: "POST",
      token,
      body: JSON.stringify({
        message,
        conversationId,
      }),
    }
  );
}