#!/usr/bin/env node

import { getDoctorReport, resolveRuntimePaths } from "../index.ts";

function main(): number {
  const jsonMode = process.argv.includes("--json");

  try {
    const report = getDoctorReport(resolveRuntimePaths(process.env));
    if (jsonMode) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(
        [
          `memoryRoot: ${report.memoryRoot}`,
          `memoryRootSource: ${report.memoryRootSource}`,
          `palacePath: ${report.palacePath}`,
          `mempalaceHome: ${report.mempalaceHome}`,
          `pythonCommand: ${report.pythonCommand}`,
          `mempalaceImportable: ${report.mempalaceImportable}`,
          `palaceExists: ${report.palaceExists}`,
          `usesSharedMount: ${report.usesSharedMount}`,
          `transcriptAutoMineEnabled: ${report.transcriptAutoMineEnabled}`,
          report.transcriptAutoMineReason ? `transcriptAutoMineReason: ${report.transcriptAutoMineReason}` : undefined,
          `guardrails.appleSilicon: ${report.guardrails.appleSilicon}`,
          `guardrails.ortDisableCoreMl: ${report.guardrails.ortDisableCoreMl ?? ""}`,
          `guardrails.chromaHnswNumThreads: ${report.guardrails.chromaHnswNumThreads ?? ""}`,
          `guardrails.defaultedChromaThreads: ${report.guardrails.defaultedChromaThreads}`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }

    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = main();
