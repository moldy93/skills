import { formatMemPalaceFailure, runMemPalaceCommand } from "./mempalace.ts";
import type { RuntimePaths } from "./types.ts";

interface JsonRpcRequest {
  id?: string | number | null;
  jsonrpc?: string;
  method: string;
  params?: Record<string, unknown>;
}

interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

const TOOLS = [
  {
    name: "mempalace_status",
    description:
      "Show shared MemPalace status. Use before historical questions when you need to confirm the palace is available.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  },
  {
    name: "mempalace_search",
    description:
      "Search shared memory for past decisions or debugging context. Pass wing from .mempalace.json when you want repo-scoped results.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["query"],
      properties: {
        query: { type: "string", minLength: 1 },
        wing: { type: "string" },
        room: { type: "string" },
        results: { type: "integer", minimum: 1, maximum: 20 },
      },
    },
  },
] as const;

function buildTextResult(text: string, isError = false): ToolResult {
  return {
    content: [{ type: "text", text }],
    ...(isError ? { isError: true } : {}),
  };
}

function callStatusTool(paths: RuntimePaths): ToolResult {
  const result = runMemPalaceCommand(paths, "status");
  if (!result.ok) {
    return buildTextResult(formatMemPalaceFailure("MemPalace status", result, paths), true);
  }

  const output = result.stdout.trim() || "MemPalace status completed with no output.";
  return buildTextResult(output);
}

function callSearchTool(paths: RuntimePaths, args: Record<string, unknown> | undefined): ToolResult {
  const query = typeof args?.query === "string" ? args.query.trim() : "";
  if (!query) {
    return buildTextResult("MemPalace search needs attention. You need to provide a non-empty query.", true);
  }

  const commandArgs = [query];
  if (typeof args?.wing === "string" && args.wing.trim()) {
    commandArgs.push("--wing", args.wing.trim());
  }
  if (typeof args?.room === "string" && args.room.trim()) {
    commandArgs.push("--room", args.room.trim());
  }
  if (typeof args?.results === "number" && Number.isInteger(args.results)) {
    commandArgs.push("--results", String(args.results));
  }

  const result = runMemPalaceCommand(paths, "search", commandArgs);
  if (!result.ok) {
    return buildTextResult(formatMemPalaceFailure("MemPalace search", result, paths), true);
  }

  const output = result.stdout.trim() || "MemPalace search completed with no output.";
  return buildTextResult(output);
}

function createFrame(payload: unknown): string {
  const body = JSON.stringify(payload);
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}

export async function runMcpServer(paths: RuntimePaths): Promise<void> {
  let buffer = Buffer.alloc(0);

  const writeResponse = (payload: unknown): void => {
    process.stdout.write(createFrame(payload));
  };

  const handleRequest = (request: JsonRpcRequest): void => {
    const responseBase = {
      jsonrpc: "2.0",
      id: request.id ?? null,
    };

    try {
      switch (request.method) {
        case "initialize":
          writeResponse({
            ...responseBase,
            result: {
              protocolVersion:
                typeof request.params?.protocolVersion === "string"
                  ? request.params.protocolVersion
                  : "2024-11-05",
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: "ai-memory-service",
                version: "0.1.0",
              },
            },
          });
          return;
        case "notifications/initialized":
          return;
        case "ping":
          writeResponse({
            ...responseBase,
            result: {},
          });
          return;
        case "tools/list":
          writeResponse({
            ...responseBase,
            result: {
              tools: TOOLS,
            },
          });
          return;
        case "tools/call": {
          const toolName = typeof request.params?.name === "string" ? request.params.name : "";
          const toolArgs =
            request.params && typeof request.params.arguments === "object"
              ? (request.params.arguments as Record<string, unknown>)
              : undefined;

          let result: ToolResult;
          if (toolName === "mempalace_status") {
            result = callStatusTool(paths);
          } else if (toolName === "mempalace_search") {
            result = callSearchTool(paths, toolArgs);
          } else {
            result = buildTextResult(`Unknown tool: ${toolName || "<empty>"}`, true);
          }

          writeResponse({
            ...responseBase,
            result,
          });
          return;
        }
        default:
          writeResponse({
            ...responseBase,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`,
            },
          });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      writeResponse({
        ...responseBase,
        error: {
          code: -32603,
          message,
        },
      });
    }
  };

  for await (const chunk of process.stdin) {
    buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))]);

    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        break;
      }

      const headerText = buffer.subarray(0, headerEnd).toString("utf8");
      const contentLengthLine = headerText
        .split("\r\n")
        .find((line) => line.toLowerCase().startsWith("content-length:"));
      if (!contentLengthLine) {
        throw new Error("MCP framing needs a Content-Length header.");
      }

      const contentLength = Number.parseInt(contentLengthLine.split(":")[1]?.trim() ?? "", 10);
      if (!Number.isFinite(contentLength) || contentLength < 0) {
        throw new Error("MCP framing received an invalid Content-Length header.");
      }

      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;
      if (buffer.length < bodyEnd) {
        break;
      }

      const body = buffer.subarray(bodyStart, bodyEnd).toString("utf8");
      buffer = buffer.subarray(bodyEnd);
      handleRequest(JSON.parse(body) as JsonRpcRequest);
    }
  }
}
