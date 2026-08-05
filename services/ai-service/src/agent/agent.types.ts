export interface AgentToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface AgentToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
}

export interface GetLiveMatchesArguments {
  limit?: number;
}

export interface SearchDocumentArguments {
  query: string;
  documentId?: string;
  limit?: number;
}

export interface AgentExecutionContext {
  userId: string;
}