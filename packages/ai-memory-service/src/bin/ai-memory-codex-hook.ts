#!/usr/bin/env node

import { findRepoRoot, loadRepoManifest, persistCodexCheckpoint, resolveRuntimePaths } from "../index.ts";
import { isMemPalaceInstalled } from "../mempalace.ts";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main(): Promise<number> {
  const hookName = process.argv[2];
  if (!hookName) {
    console.error("Add a hook name such as session-start, stop, or precompact.");
    return 1;
  }

  const paths = resolveRuntimePaths(process.env);
  const repoRoot = findRepoRoot(process.cwd());
  const manifest = loadRepoManifest(repoRoot);
  if (!manifest || !manifest.enabled) {
    return 0;
  }

  if (hookName === "session-start") {
    if (!isMemPalaceInstalled(paths)) {
      console.log(`AI memory writeback is paused. You need to install MemPalace for ${paths.pythonCommand} and restart Codex.`);
      return 0;
    }

    console.log(`AI memory hook ready for ${repoRoot} (${manifest.wing}).`);
    return 0;
  }

  const payload = await readStdin();
  const result = persistCodexCheckpoint(process.cwd(), hookName, payload, paths);
  if (result.message) {
    console.log(result.message);
  }

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
