#!/usr/bin/env node

import { bootstrapCodex, resolveRuntimePaths } from "../index.ts";

function main(): number {
  const targetPath = process.argv[2] ?? process.cwd();

  try {
    console.log(bootstrapCodex(targetPath, resolveRuntimePaths(process.env)));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = main();
