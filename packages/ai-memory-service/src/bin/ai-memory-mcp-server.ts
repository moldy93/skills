#!/usr/bin/env node

import { resolveRuntimePaths, runMcpServer } from "../index.ts";

async function main(): Promise<number> {
  try {
    await runMcpServer(resolveRuntimePaths(process.env));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

main().then((code) => {
  process.exitCode = code;
});
