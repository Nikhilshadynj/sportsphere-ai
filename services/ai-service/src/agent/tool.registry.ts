import type OpenAI from "openai";

export const agentTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_live_matches",
      description:
        "Fetch currently available live cricket matches. Use this when the user asks about live, ongoing, or current cricket matches.",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description:
              "Maximum number of live matches to return. Defaults to 5.",
            minimum: 1,
            maximum: 10,
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
  type: "function",
  function: {
    name: "search_document",
    description: [
      "Search the authenticated user's uploaded documents using semantic vector search.",
      "Use this tool when the user asks about information contained in an uploaded PDF, report, scouting document, rules document, or other user-specific document.",
      "Use the user's actual question as the query.",
      "Only provide documentId when the user or application context identifies a specific document.",
    ].join(" "),
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The semantic search query to run against the user's uploaded documents.",
        },

        documentId: {
          type: "string",
          description:
            "Optional ID of a specific uploaded document to search.",
        },

        limit: {
          type: "number",
          description:
            "Maximum number of relevant chunks to retrieve. Defaults to 5.",
          minimum: 1,
          maximum: 10,
        },
      },

      required: [
        "query",
      ],

      additionalProperties: false,
    },
  },
},
];