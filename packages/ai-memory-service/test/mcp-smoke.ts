import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const packageRoot = path.resolve(import.meta.dirname, "..");
const mcpServerBin = path.join(packageRoot, "bin", "ai-memory-mcp-server");

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFakePythonScript(directory: string): string {
  const scriptPath = path.join(directory, "fake-python.js");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);

if (args[0] === "-c" && args[1] === "import mempalace") {
  process.exit(0);
}

const moduleIndex = args.indexOf("-m");
if (moduleIndex === -1 || args[moduleIndex + 1] !== "mempalace") {
  console.error("unexpected invocation");
  process.exit(2);
}

const commandArgs = args.slice(moduleIndex + 2);
const palaceIndex = commandArgs.indexOf("--palace");
const trimmed = palaceIndex === -1
  ? commandArgs
  : [...commandArgs.slice(0, palaceIndex), ...commandArgs.slice(palaceIndex + 2)];
const command = trimmed[0];

if (command === "status") {
  process.stdout.write("MemPalace Status OK\\nROOM: docs 2 drawers\\n");
  process.exit(0);
}

if (command === "search") {
  const query = trimmed[1] ?? "";
  if (query === "crash") {
    process.stderr.write("simulated native crash");
    process.exit(139);
  }

  process.stdout.write('Results for: "' + query + '"\\nWing: wing_demo\\n[1] wing_demo / docs\\nSource: docs/notes.md\\nMatch: 0.99\\nRemember this.\\n');
  process.exit(0);
}

if (command === "init" || command === "mine") {
  process.stdout.write(command + " ok\\n");
  process.exit(0);
}

console.error("unexpected mempalace command", command);
process.exit(2);
`;

  fs.writeFileSync(scriptPath, script, "utf8");
  fs.chmodSync(scriptPath, 0o755);
  return scriptPath;
}

function createFrame(payload: unknown): string {
  const body = JSON.stringify(payload);
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}

function readMessage(stream: NodeJS.ReadableStream): Promise<unknown> {
  let buffer = Buffer.alloc(0);

  return new Promise((resolve, reject) => {
    const onData = (chunk: Buffer | string): void => {
      buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]);
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) {
        return;
      }

      const headerText = buffer.subarray(0, headerEnd).toString("utf8");
      const contentLengthLine = headerText
        .split("\r\n")
        .find((line) => line.toLowerCase().startsWith("content-length:"));
      if (!contentLengthLine) {
        cleanup();
        reject(new Error("Missing Content-Length header"));
        return;
      }

      const contentLength = Number.parseInt(contentLengthLine.split(":")[1]?.trim() ?? "", 10);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;
      if (buffer.length < bodyEnd) {
        return;
      }

      const body = buffer.subarray(bodyStart, bodyEnd).toString("utf8");
      cleanup();
      resolve(JSON.parse(body));
    };

    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };

    const cleanup = (): void => {
      stream.off("data", onData);
      stream.off("error", onError);
    };

    stream.on("data", onData);
    stream.on("error", onError);
  });
}

async function main(): Promise<number> {
  const tempHome = makeTempDir("ai-memory-mcp-home-");
  const fakePython = writeFakePythonScript(tempHome);
  const server = spawn(mcpServerBin, {
    cwd: tempHome,
    env: {
      ...process.env,
      HOME: tempHome,
      AI_MEMORY_ROOT: path.join(tempHome, "memory"),
      AI_MEMORY_PYTHON_COMMAND: fakePython,
      NODE_OPTIONS: "",
      NODE_TEST_CONTEXT: "",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  server.stderr.resume();

  const initializePromise = readMessage(server.stdout);
  server.stdin.write(
    createFrame({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05" },
    }),
  );
  const initializeResponse = (await initializePromise) as {
    result: { serverInfo: { name: string } };
  };
  assert.equal(initializeResponse.result.serverInfo.name, "ai-memory-service");

  const failedSearchPromise = readMessage(server.stdout);
  server.stdin.write(
    createFrame({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "mempalace_search",
        arguments: { query: "crash" },
      },
    }),
  );
  const failedSearchResponse = (await failedSearchPromise) as {
    result: { isError?: boolean; content: Array<{ text: string }> };
  };
  assert.equal(failedSearchResponse.result.isError, true);
  assert.match(failedSearchResponse.result.content[0].text, /repair/);

  const statusPromise = readMessage(server.stdout);
  server.stdin.write(
    createFrame({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "mempalace_status",
        arguments: {},
      },
    }),
  );
  const statusResponse = (await statusPromise) as {
    result: { isError?: boolean; content: Array<{ text: string }> };
  };
  assert.equal(statusResponse.result.isError, undefined);
  assert.match(statusResponse.result.content[0].text, /MemPalace Status OK/);

  await new Promise<void>((resolve) => {
    server.once("close", () => resolve());
    server.kill("SIGTERM");
  });

  console.log("✔ ai-memory-mcp-server keeps transport alive when search fails");
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
