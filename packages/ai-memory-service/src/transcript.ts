import fs from "node:fs";
import path from "node:path";
import { findRepoRoot, loadRepoManifest } from "./manifest.ts";
import { formatMemPalaceFailure, isMemPalaceInstalled, runMemPalaceCommand } from "./mempalace.ts";
import { computeSha256, ensureMemoryDirectories, readJsonFile, sanitizeFileComponent, writeJsonFile } from "./storage.ts";
import type { PersistTranscriptResult, RepoMemoryManifest, RuntimePaths } from "./types.ts";

interface ExtractedMessage {
  role: string;
  text: string;
}

function normalizeBlockText(block: unknown): string {
  if (typeof block === "string") {
    return block.trim();
  }

  if (!block || typeof block !== "object") {
    return "";
  }

  const candidate = block as Record<string, unknown>;
  if (typeof candidate.text === "string") {
    return candidate.text.trim();
  }

  if (candidate.type === "tool_use") {
    return `Tool call: ${typeof candidate.name === "string" ? candidate.name : "unknown"}\n${JSON.stringify(candidate.input ?? {}, null, 2)}`;
  }

  if (candidate.type === "tool_result") {
    return `Tool result:\n${normalizeBlockText(candidate.content ?? "")}`;
  }

  if (candidate.type === "input_text" && typeof candidate.text === "string") {
    return candidate.text.trim();
  }

  if (Array.isArray(candidate.content)) {
    return candidate.content.map((item) => normalizeBlockText(item)).filter(Boolean).join("\n\n");
  }

  return "";
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content.map((item) => normalizeBlockText(item)).filter(Boolean).join("\n\n").trim();
  }

  return normalizeBlockText(content);
}

function extractMessagesFromUnknown(value: unknown, sink: ExtractedMessage[], seen: Set<unknown>): void {
  if (!value || typeof value !== "object" || seen.has(value)) {
    return;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      extractMessagesFromUnknown(item, sink, seen);
    }
    return;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.role === "string") {
    const text = normalizeMessageContent(record.content);
    if (text) {
      sink.push({ role: record.role, text });
    }
  }

  for (const candidate of Object.values(record)) {
    extractMessagesFromUnknown(candidate, sink, seen);
  }
}

function findSessionKey(value: unknown, seen: Set<unknown>): string | undefined {
  if (!value || typeof value !== "object" || seen.has(value)) {
    return undefined;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findSessionKey(item, seen);
      if (nested) {
        return nested;
      }
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of ["session_id", "sessionId", "conversation_id", "conversationId", "thread_id", "threadId"]) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const candidate of Object.values(record)) {
    const nested = findSessionKey(candidate, seen);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function getMemoryAvailability(cwd: string, paths: RuntimePaths) {
  const repoRoot = findRepoRoot(cwd);
  const manifest = loadRepoManifest(repoRoot);
  if (!manifest || !manifest.enabled) {
    return {
      ok: false as const,
      message: `Shared memory is off for ${repoRoot}. Run ai-memory-init ${repoRoot} to opt this repo in.`,
    };
  }

  return {
    ok: true as const,
    repoRoot,
    manifest,
  };
}

export function serializeCodexHookTranscript(
  hookName: string,
  rawPayload: string,
  repoRoot: string,
  manifest: RepoMemoryManifest,
): { sessionKey: string; transcript: string } {
  let parsedPayload: unknown = rawPayload;
  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch {
    parsedPayload = rawPayload;
  }

  const messages: ExtractedMessage[] = [];
  extractMessagesFromUnknown(parsedPayload, messages, new Set<unknown>());
  const sessionKey = sanitizeFileComponent(findSessionKey(parsedPayload, new Set<unknown>()) ?? "active-session");

  const lines = [
    "# Codex Hook Transcript",
    `- Project: ${manifest.project}`,
    `- Wing: ${manifest.wing}`,
    `- Repo: ${repoRoot}`,
    `- Hook: ${hookName}`,
    `- Session: ${sessionKey}`,
    "",
  ];

  for (const message of messages) {
    lines.push(`## ${message.role}`, "", message.text, "");
  }

  if (messages.length === 0) {
    lines.push(
      "## Raw Payload",
      "",
      "```json",
      typeof parsedPayload === "string" ? rawPayload : JSON.stringify(parsedPayload, null, 2),
      "```",
      "",
    );
  }

  return {
    sessionKey,
    transcript: lines.join("\n").trim().concat("\n"),
  };
}

function persistTranscriptToMemPalace(options: {
  hashStorePath: string;
  manifest: RepoMemoryManifest;
  paths: RuntimePaths;
  sessionKey: string;
  stageRoot: string;
  transcript: string;
}): PersistTranscriptResult {
  const stageDirectory = path.join(options.stageRoot, options.manifest.wing);
  const stageFilePath = path.join(stageDirectory, `${sanitizeFileComponent(options.sessionKey)}.md`);
  const hashKey = `${options.manifest.wing}:${sanitizeFileComponent(options.sessionKey)}`;
  const transcriptHash = computeSha256(options.transcript);
  const hashStore = readJsonFile<Record<string, string>>(options.hashStorePath, {});

  if (hashStore[hashKey] === transcriptHash) {
    return {
      changed: false,
      message: "Skipped unchanged transcript export.",
      stageFilePath,
    };
  }

  fs.mkdirSync(stageDirectory, { recursive: true });
  fs.writeFileSync(stageFilePath, options.transcript, "utf8");
  hashStore[hashKey] = transcriptHash;
  writeJsonFile(options.hashStorePath, hashStore);

  if (!isMemPalaceInstalled(options.paths)) {
    return {
      changed: true,
      message: `Staged transcript memory for ${options.manifest.wing}. You need to install MemPalace before automatic mining can run.`,
      stageFilePath,
    };
  }

  if (!options.paths.transcriptAutoMineEnabled) {
    return {
      changed: true,
      message: `Staged transcript memory for ${options.manifest.wing}. ${options.paths.transcriptAutoMineReason ?? "Automatic transcript mining is disabled."}`,
      stageFilePath,
    };
  }

  const mineResult = runMemPalaceCommand(options.paths, "mine", [
    stageDirectory,
    "--mode",
    "convos",
    "--wing",
    options.manifest.wing,
  ]);
  if (!mineResult.ok) {
    return {
      changed: true,
      message: `Staged transcript memory, but mining needs attention. ${formatMemPalaceFailure("Transcript mining", mineResult, options.paths)}`,
      stageFilePath,
    };
  }

  return {
    changed: true,
    message: `Wrote and mined shared transcript memory for ${options.manifest.wing}.`,
    stageFilePath,
  };
}

export function persistCodexCheckpoint(
  cwd: string,
  hookName: string,
  rawPayload: string,
  paths: RuntimePaths,
): PersistTranscriptResult {
  const availability = getMemoryAvailability(cwd, paths);
  if (!availability.ok) {
    return {
      changed: false,
      message: availability.message,
    };
  }

  ensureMemoryDirectories(paths);
  const { sessionKey, transcript } = serializeCodexHookTranscript(
    hookName,
    rawPayload,
    availability.repoRoot,
    availability.manifest,
  );

  return persistTranscriptToMemPalace({
    hashStorePath: paths.codexSessionHashStorePath,
    manifest: availability.manifest,
    paths,
    sessionKey,
    stageRoot: paths.codexStagingRoot,
    transcript,
  });
}
