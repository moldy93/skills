#!/usr/bin/env node

import { bootstrapOpenClaw, resolveRuntimePaths } from "../index.ts";

function main(): number {
  const skillSourceFlagIndex = process.argv.indexOf("--skill-source");
  const skillSource =
    skillSourceFlagIndex !== -1 && process.argv[skillSourceFlagIndex + 1]
      ? process.argv[skillSourceFlagIndex + 1]
      : undefined;

  try {
    console.log(bootstrapOpenClaw(resolveRuntimePaths(process.env), skillSource));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = main();
