import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { RuntimePaths } from "./types.ts";

export function ensureDirectory(targetPath: string): void {
  fs.mkdirSync(targetPath, { recursive: true });
}

export function ensureMemoryDirectories(paths: RuntimePaths): void {
  for (const targetPath of [
    paths.memoryRoot,
    paths.palacePath,
    paths.codexStagingRoot,
    paths.manualStagingRoot,
    paths.stateRoot,
  ]) {
    ensureDirectory(targetPath);
  }
}

export function readJsonFile<T>(targetPath: string, fallback: T): T {
  if (!fs.existsSync(targetPath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(targetPath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJsonFile(targetPath: string, value: unknown): void {
  ensureDirectory(path.dirname(targetPath));
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function computeSha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export function sanitizeFileComponent(value: string): string {
  return (
    value
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "session"
  );
}
