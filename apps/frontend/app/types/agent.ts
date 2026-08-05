export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

export interface AgentChatResponse {
  success: boolean;
  response: string;
  toolsUsed: string[];
}