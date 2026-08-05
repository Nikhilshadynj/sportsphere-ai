import {
  executeGetLiveMatches,
} from "./tools/live-match.tool";

import {
  executeSearchDocument,
} from "./tools/document-search.tool";

import type {
  AgentExecutionContext,
  AgentToolResult,
  GetLiveMatchesArguments,
  SearchDocumentArguments
} from "./agent.types";

const parseArguments = <T>(
  rawArguments: string
): T => {
  if (!rawArguments.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(rawArguments) as T;
  } catch {
    throw new Error(
      "The AI returned invalid tool arguments"
    );
  }
};

export const executeAgentTool = async (
  toolCallId: string,
  toolName: string,
  rawArguments: string,
  context: AgentExecutionContext

): Promise<AgentToolResult> => {
  switch (toolName) {
    case "get_live_matches": {
      const args =
        parseArguments<GetLiveMatchesArguments>(
          rawArguments
        );

      const result =
        await executeGetLiveMatches(args);

      return {
        toolCallId,
        toolName,
        result,
      };
    }

       case "search_document": {
      const args =
        parseArguments<SearchDocumentArguments>(
          rawArguments
        );

      const result =
        await executeSearchDocument({
          userId:
            context.userId,
          args,
        });

      return {
        toolCallId,
        toolName,
        result,
      };
    }

    default:
      throw new Error(
        `Unsupported agent tool: ${toolName}`
      );
  }
};